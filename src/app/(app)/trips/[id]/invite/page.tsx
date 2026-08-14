import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { InviteForm } from "@/components/InviteForm";

export default async function InvitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: trip } = await supabase.from("trips").select("id, destination, owner_id").eq("id", id).single();
  if (!trip) notFound();
  const { data: collabs } = await supabase
    .from("trip_collaborators")
    .select("*")
    .eq("trip_id", id);
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Zaproś do „{trip.destination}"</h1>
      <InviteForm tripId={id} initial={collabs ?? []} />
    </div>
  );
}
