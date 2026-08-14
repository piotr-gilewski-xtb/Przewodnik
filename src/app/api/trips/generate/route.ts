import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateItinerary } from "@/lib/ai/generate";

export const maxDuration = 60;

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { destination, startDate, endDate, preferences = {}, mustSee = [], notes = "" } = body;
  if (!destination || !startDate || !endDate) {
    return NextResponse.json({ error: "Brak wymaganych pól" }, { status: 400 });
  }

  const { data: trip, error: tripErr } = await supabase
    .from("trips")
    .insert({ owner_id: user.id, destination, start_date: startDate, end_date: endDate, preferences, notes, status: "generating" })
    .select().single();
  if (tripErr || !trip) return NextResponse.json({ error: tripErr?.message }, { status: 500 });

  try {
    const plan = await generateItinerary({ destination, startDate, endDate, preferences, mustSee, notes });
    for (let i = 0; i < plan.days.length; i++) {
      const d = plan.days[i];
      const { data: day } = await supabase
        .from("plan_days").insert({ trip_id: trip.id, day_date: d.day_date, position: i }).select().single();
      if (!day || !d.attractions.length) continue;
      await supabase.from("attractions").insert(
        d.attractions.map((a, j) => ({
          plan_day_id: day.id, name: a.name, description: a.description,
          start_time: a.start_time, end_time: a.end_time,
          address: a.address ?? null, lat: a.lat ?? null, lng: a.lng ?? null,
          google_place_id: a.google_place_id ?? null,
          google_maps_url: a.google_maps_url ?? null,
          photo_url: a.photo_url ?? null,
          photo_source: a.photo_url ? "osm" : null,
          position: j,
        })),
      );
    }
    await supabase.from("trips").update({ status: "ready" }).eq("id", trip.id);
    await supabase.from("ai_generations").insert({ trip_id: trip.id, kind: "initial", prompt: body, response: plan });
    return NextResponse.json({ tripId: trip.id });
  } catch (e) {
    await supabase.from("trips").update({ status: "error" }).eq("id", trip.id);
    return NextResponse.json({ error: (e as Error).message, tripId: trip.id }, { status: 500 });
  }
}
