import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateItinerary } from "@/lib/ai/generate";

export const maxDuration = 60;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: trip } = await supabase.from("trips").select("*").eq("id", id).single();
  if (!trip) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await supabase.from("plan_days").delete().eq("trip_id", id);
  await supabase.from("trips").update({ status: "generating" }).eq("id", id);

  try {
    const plan = await generateItinerary({
      destination: trip.destination,
      startDate: trip.start_date,
      endDate: trip.end_date,
      preferences: trip.preferences ?? {},
      notes: trip.notes ?? "",
    });
    for (let i = 0; i < plan.days.length; i++) {
      const d = plan.days[i];
      const { data: day } = await supabase
        .from("plan_days").insert({ trip_id: id, day_date: d.day_date, position: i }).select().single();
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
    await supabase.from("trips").update({ status: "ready" }).eq("id", id);
    await supabase.from("ai_generations").insert({ trip_id: id, kind: "regenerate", response: plan });
    return NextResponse.json({ ok: true });
  } catch (e) {
    await supabase.from("trips").update({ status: "error" }).eq("id", id);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
