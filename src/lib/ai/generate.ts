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

export async function generateItinerary(input: Input): Promise<GeneratedPlan> {
  const dates = eachDate(input.startDate, input.endDate);
  const prefs = Object.entries(input.preferences).filter(([, v]) => v).map(([k]) => k).join(", ") || "brak";

  const system = `Jesteś ekspertem od podróży. Zwracasz WYŁĄCZNIE JSON, bez tekstu wokół.
Schemat:
{
  "days": [
    { "day_date": "YYYY-MM-DD",
      "attractions": [
        { "name": "Nazwa atrakcji (prawdziwa, znana)",
          "description": "1 zdanie po polsku",
          "start_time": "HH:MM", "end_time": "HH:MM" }
      ] }
  ]
}`;

  const user = `Kierunek: ${input.destination}
Dni (${dates.length}): ${dates.join(", ")}
Preferencje: ${prefs}
${input.mustSee?.length ? `Uwzględnij: ${input.mustSee.join(", ")}` : ""}
${input.notes ? `Notatki: ${input.notes}` : ""}

Dla KAŻDEGO dnia podaj 3–4 znane atrakcje (godziny 09:00–20:00, w tym obiad). Używaj prawdziwych, popularnych nazw miejsc w ${input.destination}.`;

  const res = await getGroq().chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" },
    temperature: 0.5,
  });

  const raw = res.choices[0].message.content ?? "{}";
  const parsed = JSON.parse(raw) as GeneratedPlan;
  if (!parsed.days?.length) throw new Error("LLM zwrócił pusty plan");

  await enrichPlan(parsed, input.destination);
  return parsed;
}

async function enrichPlan(plan: GeneratedPlan, destination: string): Promise<void> {
  const all = plan.days.flatMap((d) => d.attractions);
  await Promise.all(
    all.map(async (a) => {
      const [placeResults, wikiPhoto] = await Promise.all([
        searchPlaces(a.name, destination),
        fetchPhoto(`en:${a.name}`),
      ]);
      const p = placeResults[0];
      if (p) {
        a.address = p.address;
        a.lat = p.lat;
        a.lng = p.lng;
        a.google_place_id = p.placeId;
      }
      a.google_maps_url = mapsUrl({ name: a.name, address: p?.address ?? destination });
      a.photo_url = wikiPhoto ?? (p?.wikipediaKey ? await fetchPhoto(p.wikipediaKey) : undefined);
    }),
  );
}
