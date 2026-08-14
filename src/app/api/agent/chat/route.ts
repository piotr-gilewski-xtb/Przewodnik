import { NextResponse } from "next/server";
import type Groq from "groq-sdk";
import { createClient } from "@/lib/supabase/server";
import { groq, MODEL } from "@/lib/ai/client";
import { searchPlaces } from "@/lib/osm/places";
import { mapsUrl } from "@/lib/utils";

export const maxDuration = 120;

const tools: Groq.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_places",
      description: "Szukaj prawdziwych miejsc w OpenStreetMap.",
      parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
    },
  },
  {
    type: "function",
    function: {
      name: "add_attraction",
      description: "Dodaj atrakcję do planu w wybranym dniu (day_index: 0 = pierwszy dzień).",
      parameters: {
        type: "object",
        properties: {
          day_index: { type: "number" },
          name: { type: "string" },
          description: { type: "string" },
          start_time: { type: "string" },
          end_time: { type: "string" },
          place_id: { type: "string" },
        },
        required: ["day_index", "name"],
      },
    },
  },
];

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tripId, messages } = await req.json();
  const { data: trip } = await supabase.from("trips").select("*").eq("id", tripId).single();
  if (!trip) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { data: days } = await supabase.from("plan_days").select("*").eq("trip_id", tripId).order("position");

  const cache = new Map<string, { name: string; address?: string; lat?: number; lng?: number; photoUrl?: string }>();
  let planChanged = false;

  const system = `Jesteś asystentem podróży dla ${trip.destination} (${trip.start_date}–${trip.end_date}).
Plan ma ${days?.length ?? 0} dni. Możesz szukać prawdziwych miejsc (search_places) i dodawać je do planu (add_attraction).
Odpowiadaj zwięźle po polsku.`;

  const conv: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: system },
    ...messages.map((m: { role: "user" | "assistant"; content: string }) => ({ role: m.role, content: m.content })),
  ];

  for (let step = 0; step < 8; step++) {
    const res = await groq.chat.completions.create({
      model: MODEL, messages: conv, tools, tool_choice: "auto", temperature: 0.5,
    });
    const msg = res.choices[0].message;
    conv.push(msg);

    if (!msg.tool_calls?.length) {
      const reply = msg.content ?? "Gotowe.";
      await supabase.from("chat_messages").insert([
        { trip_id: tripId, user_id: user.id, role: "user", content: messages[messages.length - 1]?.content ?? "" },
        { trip_id: tripId, role: "assistant", content: reply },
      ]);
      return NextResponse.json({ reply, planChanged });
    }

    for (const call of msg.tool_calls) {
      if (call.type !== "function") continue;
      const args = safeJson(call.function.arguments);
      if (call.function.name === "search_places") {
        const found = await searchPlaces(args.query as string, trip.destination);
        for (const f of found) cache.set(f.placeId, f);
        conv.push({
          role: "tool", tool_call_id: call.id,
          content: JSON.stringify(found.map((f) => ({ place_id: f.placeId, name: f.name, address: f.address }))),
        });
      } else if (call.function.name === "add_attraction") {
        const day = days?.[args.day_index as number];
        if (!day) {
          conv.push({ role: "tool", tool_call_id: call.id, content: "Błąd: brak dnia o tym indeksie" });
          continue;
        }
        const c = args.place_id ? cache.get(args.place_id as string) : undefined;
        const { count } = await supabase.from("attractions").select("*", { count: "exact", head: true }).eq("plan_day_id", day.id);
        await supabase.from("attractions").insert({
          plan_day_id: day.id,
          name: args.name as string,
          description: (args.description as string) ?? null,
          start_time: (args.start_time as string) ?? null,
          end_time: (args.end_time as string) ?? null,
          address: c?.address ?? null, lat: c?.lat ?? null, lng: c?.lng ?? null,
          google_place_id: (args.place_id as string) ?? null,
          google_maps_url: mapsUrl({ name: args.name as string, address: c?.address }),
          photo_url: c?.photoUrl ?? null,
          photo_source: c?.photoUrl ? "osm" : null,
          position: count ?? 0,
        });
        planChanged = true;
        conv.push({ role: "tool", tool_call_id: call.id, content: "Dodano" });
      }
    }
  }
  return NextResponse.json({ reply: "Nie udało się dokończyć.", planChanged });
}

function safeJson(s: string): Record<string, unknown> {
  try { return JSON.parse(s); } catch { return {}; }
}
