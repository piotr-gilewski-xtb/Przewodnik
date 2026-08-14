import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { TripView } from "@/components/TripView";
import type { Attraction, PlanDay, Trip } from "@/lib/types";

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: trip } = await supabase.from("trips").select("*").eq("id", id).single();
  if (!trip) notFound();
  const { data: days } = await supabase
    .from("plan_days")
    .select("*")
    .eq("trip_id", id)
    .order("position");
  const dayIds = (days ?? []).map((d) => d.id);
  const { data: attractions } = dayIds.length
    ? await supabase.from("attractions").select("*").in("plan_day_id", dayIds).order("position")
    : { data: [] as Attraction[] };

  return (
    <div className="p-4 space-y-4">
      <header className="space-y-1">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{trip.destination}</h1>
          <Link href={`/trips/${trip.id}/invite`} className="text-sm text-sky-500">Zaproś</Link>
        </div>
        <p className="text-sm text-zinc-500">{trip.start_date} — {trip.end_date}</p>
      </header>
      <TripView
        trip={trip as Trip}
        days={(days ?? []) as PlanDay[]}
        attractions={(attractions ?? []) as Attraction[]}
      />
    </div>
  );
}
