import type Groq from "groq-sdk";
import { groq, MODEL } from "./client";
import { searchPlaces } from "@/lib/osm/places";
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

export type GeneratedPlan = {
  days: { day_date: string; attractions: GeneratedAttraction[] }[];
};

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
      description: "Szukaj prawdziwych atrakcji w OpenStreetMap. Zwraca do 5 wyników z place_id, adresem, współrzędnymi i (jeśli dostępnym) zdjęciem.",
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
      description: "Zapisz gotowy plan zwiedzania. Wywołaj DOKŁADNIE RAZ na końcu.",
      parameters: {
        type: "object",
        properties: {
          days: {
            type: "array",
            items: {
              type: "object",
              properties: {
                day_date: { type: "string", description: "YYYY-MM-DD" },
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
  const prefs = Object.entries(input.preferences).filter(([, v]) => v).map(([k]) => k).join(", ") || "brak preferencji";
  const system = `Jesteś ekspertem od podróży. Zaplanuj zwiedzanie ${input.destination} na ${dates.length} dni (${dates.join(", ")}).
Preferencje: ${prefs}.
${input.mustSee?.length ? `Uwzględnij: ${input.mustSee.join(", ")}.` : ""}
${input.notes ? `Notatki: ${input.notes}` : ""}

Zasady:
- Użyj search_places aby znaleźć PRAWDZIWE atrakcje z OpenStreetMap. Nie zmyślaj.
- 3–5 atrakcji dziennie, godziny 09:00–20:00, z obiadem w środku.
- Grupuj geograficznie w obrębie jednego dnia.
- Krótkie polskie opisy (1–2 zdania).
- NA KOŃCU wywołaj submit_plan z pełnym planem używając place_id z wyników search_places.`;

  const cache = new Map<string, { name: string; address?: string; lat?: number; lng?: number; photoUrl?: string }>();
  const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: system },
    { role: "user", content: "Zaplanuj podróż." },
  ];

  for (let step = 0; step < 12; step++) {
    const res = await groq.chat.completions.create({
      model: MODEL,
      messages,
      tools,
      tool_choice: "auto",
      temperature: 0.4,
    });
    const msg = res.choices[0].message;
    messages.push(msg);

    if (!msg.tool_calls?.length) {
      throw new Error("Model nie wywołał submit_plan");
    }

    let submitted: GeneratedPlan | null = null;

    for (const call of msg.tool_calls) {
      if (call.type !== "function") continue;
      const args = safeJson(call.function.arguments);
      if (call.function.name === "search_places") {
        const found = await searchPlaces(args.query as string, input.destination);
        for (const f of found) cache.set(f.placeId, f);
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(found.map((f) => ({ place_id: f.placeId, name: f.name, address: f.address }))),
        });
      } else if (call.function.name === "submit_plan") {
        const raw = args as unknown as { days: { day_date: string; attractions: { name: string; description: string; start_time: string; end_time: string; place_id?: string }[] }[] };
        submitted = {
          days: raw.days.map((d) => ({
            day_date: d.day_date,
            attractions: d.attractions.map((a) => {
              const c = a.place_id ? cache.get(a.place_id) : undefined;
              return {
                name: a.name,
                description: a.description,
                start_time: a.start_time,
                end_time: a.end_time,
                address: c?.address,
                lat: c?.lat,
                lng: c?.lng,
                google_place_id: a.place_id,
                photo_url: c?.photoUrl,
                google_maps_url: mapsUrl({ name: a.name, address: c?.address }),
              };
            }),
          })),
        };
        messages.push({ role: "tool", tool_call_id: call.id, content: "OK" });
      }
    }

    if (submitted) return submitted;
  }
  throw new Error("Przekroczono limit iteracji");
}

function safeJson(s: string): Record<string, unknown> {
  try { return JSON.parse(s); } catch { return {}; }
}
