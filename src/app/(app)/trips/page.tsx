import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Plus } from "lucide-react";

export default async function TripsPage() {
  const supabase = await createClient();
  const { data: trips } = await supabase
    .from("trips")
    .select("id, destination, start_date, end_date, status")
    .order("created_at", { ascending: false });

  return (
    <div className="p-4 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Twoje podróże</h1>
        <Link href="/trips/new" className="inline-flex items-center gap-1 px-3 py-2 rounded-full bg-sky-500 text-white text-sm">
          <Plus size={16} /> Nowa
        </Link>
      </header>
      {!trips?.length ? (
        <div className="text-center py-16 text-zinc-500">
          Nie masz jeszcze żadnej podróży.<br />
          <Link href="/trips/new" className="text-sky-500 underline">Zaplanuj pierwszą</Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {trips.map((t) => (
            <li key={t.id}>
              <Link
                href={`/trips/${t.id}`}
                className="block rounded-xl border border-zinc-200 p-4 hover:border-sky-400 transition dark:border-zinc-800"
              >
                <div className="font-semibold text-lg">{t.destination}</div>
                <div className="text-sm text-zinc-500">
                  {t.start_date} — {t.end_date}
                </div>
                <div className="text-xs mt-2 uppercase tracking-wide text-zinc-400">{t.status}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
