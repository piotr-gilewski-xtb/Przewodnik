"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AttractionCard } from "./AttractionCard";
import { AIChatDrawer } from "./AIChatDrawer";
import { Plus, RefreshCw, Sparkles } from "lucide-react";
import type { Attraction, PlanDay, Trip } from "@/lib/types";

type Props = { trip: Trip; days: PlanDay[]; attractions: Attraction[] };

export function TripView({ trip, days: initialDays, attractions: initialAttractions }: Props) {
  const [days, setDays] = useState(initialDays);
  const [attractions, setAttractions] = useState(initialAttractions);
  const [chatOpen, setChatOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`trip:${trip.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "attractions" }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "plan_days", filter: `trip_id=eq.${trip.id}` }, () => router.refresh())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [trip.id, router]);

  useEffect(() => { setDays(initialDays); setAttractions(initialAttractions); }, [initialDays, initialAttractions]);

  async function regenerate() {
    if (!confirm("Wygenerować plan od nowa? Obecne dni i atrakcje zostaną usunięte.")) return;
    startTransition(async () => {
      const res = await fetch(`/api/trips/${trip.id}/regenerate`, { method: "POST" });
      if (res.ok) router.refresh();
      else alert("Regeneracja nie powiodła się");
    });
  }

  async function addAttraction(dayId: string) {
    const name = prompt("Nazwa atrakcji:");
    if (!name) return;
    const supabase = createClient();
    const pos = attractions.filter((a) => a.plan_day_id === dayId).length;
    const { data } = await supabase
      .from("attractions")
      .insert({ plan_day_id: dayId, name, position: pos })
      .select()
      .single();
    if (data) setAttractions((prev) => [...prev, data as Attraction]);
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={regenerate}
          disabled={pending}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-zinc-300 text-sm disabled:opacity-50 dark:border-zinc-700"
        >
          <RefreshCw size={14} className={pending ? "animate-spin" : ""} /> Regeneruj
        </button>
        <button
          onClick={() => setChatOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-sky-500 text-white text-sm"
        >
          <Sparkles size={14} /> Agent AI
        </button>
      </div>

      <div className="space-y-6 mt-4">
        {days.map((day, i) => (
          <section key={day.id} className="space-y-3">
            <h2 className="font-semibold text-lg">
              Dzień {i + 1} <span className="text-zinc-400 font-normal">· {day.day_date}</span>
            </h2>
            <ul className="space-y-3">
              {attractions
                .filter((a) => a.plan_day_id === day.id)
                .sort((a, b) => a.position - b.position)
                .map((a) => (
                  <li key={a.id}>
                    <AttractionCard
                      attraction={a}
                      onChange={(next) =>
                        setAttractions((prev) => prev.map((x) => (x.id === next.id ? next : x)))
                      }
                      onDelete={(id) => setAttractions((prev) => prev.filter((x) => x.id !== id))}
                    />
                  </li>
                ))}
            </ul>
            <button
              onClick={() => addAttraction(day.id)}
              className="inline-flex items-center gap-1 text-sm text-sky-500"
            >
              <Plus size={14} /> Dodaj atrakcję
            </button>
          </section>
        ))}
        {!days.length && (
          <p className="text-center text-zinc-500 py-12">Brak planu — kliknij Regeneruj.</p>
        )}
      </div>

      <AIChatDrawer tripId={trip.id} open={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  );
}
