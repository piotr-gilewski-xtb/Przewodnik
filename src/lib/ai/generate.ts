import type Groq from "groq-sdk";
import { getGroq, MODEL } from "./client";
import { searchPlaces, fetchPhoto } from "@/lib/osm/places";
import { eachDate, mapsUrl } from "@/lib/utils";
import type { Preferences } from "@/lib/types";

export type GeneratedAttraction = {
  name: string;
  description: string;
  start_time: string;
  end_time: string;
  address?: string;
  lat?: number;
  lng?: number;
  google_place_id?: string;
  google_maps_url?: string;
  photo_url?: string;
};

export type GeneratedPlan = { days: { day_date: string; attractions: GeneratedAttraction[] }[] };

type Input = {
  destination: string;
  startDate: string;
  endDate: string;
  preferences: Preferences;
  mustSee?: string[];
  notes?: string;
};

const tools: Groq.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_places",
      description: "Znajdź prawdziwe atrakcje w OSM. Zwraca do 5 wyników.",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "submit_plan",
      description: "Zapisz gotowy plan. Wywołaj DOKŁADNIE RAZ na końcu.",
      parameters: {
        type: "object",
        properties: {
          days: {
            type: "array",
            items: {
              type: "object",
              properties: {
                day_date: { type: "string" },
                attractions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      description: { type: "string" },
                      start_time: { type: "string" },
                      end_time: { type: "string" },
                      place_id: { type: "string" },
                    },
                    required: ["name", "description", "start_time", "end_time"],
                  },
                },
              },
              required: ["day_date", "attractions"],
            },
          },
        },
        required: ["days"],
      },
    },
  },
];

export async function generateItinerary(input: Input): Promise<GeneratedPlan> {
  const dates = eachDate(input.startDate, input.endDate);
  const prefs = Object.entries(input.preferences).filter(([, v]) => v).map(([k]) => k).join(", ") || "brak";
  const system = `Zaplanuj zwiedzanie ${input.destination} na ${dates.length} dni: ${dates.join(", ")}.
Preferencje: ${prefs}. ${input.mustSee?.length ? `Must-see: ${input.mustSee.join(", ")}.` : ""} ${input.notes ?? ""}

Zasady:
- Użyj search_places 3–6 razy aby znaleźć PRAWDZIWE miejsca (nie zmyślaj).
- 3–4 atrakcje/dzień, godziny 09:00–20:00 z obiadem.
- Krótkie polskie opisy (1 zdanie).
- Grupuj geograficznie.
- Na końcu WYWOŁAJ submit_plan z pełnym planem, używając place_id z wyników.`;

  const cache = new Map<string, { name: string; address?: string; lat?: number; lng?: number; wikipediaKey?: string }>();
  const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: system },
    { role: "user", content: "Zaplanuj podróż." },
  ];

  for (let step = 0; step < 8; step++) {
    const res = await getGroq().chat.completions.create({
      model: MODEL,
      messages,
      tools,
      tool_choice: step >= 5 ? { type: "function", function: { name: "submit_plan" } } : "auto",
      temperature: 0.3,
    });
    const msg = res.choices[0].message;
    messages.push(msg);

    if (!msg.tool_calls?.length) throw new Error("Model nie wywołał submit_plan");

    let submitted: GeneratedPlan | null = null;
    const parallelSearches: Promise<void>[] = [];

    for (const call of msg.tool_calls) {
      if (call.type !== "function") continue;
      const args = safeJson(call.function.arguments);
      if (call.function.name === "search_places") {
        parallelSearches.push((async () => {
          const found = await searchPlaces(args.query as string, input.destination);
          for (const f of found) cache.set(f.placeId, f);
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify(found.map((f) => ({ place_id: f.placeId, name: f.name, address: f.address }))),
          });
        })());
      } else if (call.function.name === "submit_plan") {
        const raw = args as unknown as { days: { day_date: string; attractions: { name: string; description: string; start_time: string; end_time: string; place_id?: string }[] }[] };
        submitted = { days: raw.days.map((d) => ({ day_date: d.day_date, attractions: d.attractions.map((a) => ({
          name: a.name, description: a.description, start_time: a.start_time, end_time: a.end_time,
          google_place_id: a.place_id,
        })) })) };
        messages.push({ role: "tool", tool_call_id: call.id, content: "OK" });
      }
    }

    await Promise.all(parallelSearches);

    if (submitted) return enrichPlan(submitted, cache);
  }
  throw new Error("Przekroczono limit iteracji");
}

async function enrichPlan(
  plan: GeneratedPlan,
  cache: Map<string, { name: string; address?: string; lat?: number; lng?: number; wikipediaKey?: string }>,
): Promise<GeneratedPlan> {
  const allAttractions = plan.days.flatMap((d) => d.attractions);
  await Promise.all(allAttractions.map(async (a) => {
    const c = a.google_place_id ? cache.get(a.google_place_id) : undefined;
    a.address = c?.address;
    a.lat = c?.lat;
    a.lng = c?.lng;
    a.google_maps_url = mapsUrl({ name: a.name, address: c?.address });
    if (c?.wikipediaKey) a.photo_url = await fetchPhoto(c.wikipediaKey);
    if (!a.photo_url) a.photo_url = await fetchPhoto(`en:${a.name}`);
  }));
  return plan;
}

function safeJson(s: string): Record<string, unknown> {
  try { return JSON.parse(s); } catch { return {}; }
}
