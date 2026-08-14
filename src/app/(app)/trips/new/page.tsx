"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PREFERENCE_LABELS, type Preferences } from "@/lib/types";

export default function NewTripPage() {
  const router = useRouter();
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [mustSee, setMustSee] = useState("");
  const [notes, setNotes] = useState("");
  const [prefs, setPrefs] = useState<Preferences>({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function toggle(k: keyof Preferences) {
    setPrefs((p) => ({ ...p, [k]: !p[k] }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    const res = await fetch("/api/trips/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        destination,
        startDate,
        endDate,
        preferences: prefs,
        mustSee: mustSee.split(",").map((s) => s.trim()).filter(Boolean),
        notes,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error ?? "Nie udało się wygenerować planu");
      setLoading(false);
      return;
    }
    const { tripId } = await res.json();
    router.push(`/trips/${tripId}`);
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">Nowa podróż</h1>
      <form onSubmit={submit} className="space-y-5">
        <label className="block space-y-1">
          <span className="text-sm text-zinc-600">Kierunek</span>
          <input
            required
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="np. Lizbona"
            className="w-full px-4 py-3 rounded-lg border border-zinc-300 bg-white dark:bg-zinc-900 dark:border-zinc-700"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-sm text-zinc-600">Od</span>
            <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-3 rounded-lg border border-zinc-300 bg-white dark:bg-zinc-900 dark:border-zinc-700" />
          </label>
          <label className="block space-y-1">
            <span className="text-sm text-zinc-600">Do</span>
            <input type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-3 rounded-lg border border-zinc-300 bg-white dark:bg-zinc-900 dark:border-zinc-700" />
          </label>
        </div>
        <div className="space-y-2">
          <span className="text-sm text-zinc-600">Preferencje</span>
          <div className="flex flex-wrap gap-2">
            {PREFERENCE_LABELS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => toggle(key)}
                className={`px-3 py-1.5 rounded-full text-sm border transition ${
                  prefs[key]
                    ? "bg-sky-500 text-white border-sky-500"
                    : "border-zinc-300 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <label className="block space-y-1">
          <span className="text-sm text-zinc-600">Punkty obowiązkowe (opcjonalnie, po przecinku)</span>
          <input
            value={mustSee}
            onChange={(e) => setMustSee(e.target.value)}
            placeholder="Wieża Belem, LX Factory"
            className="w-full px-4 py-3 rounded-lg border border-zinc-300 bg-white dark:bg-zinc-900 dark:border-zinc-700"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-zinc-600">Notatki dla AI (opcjonalnie)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Podróżujemy z dzieckiem, preferujemy transport pieszy…"
            className="w-full px-4 py-3 rounded-lg border border-zinc-300 bg-white dark:bg-zinc-900 dark:border-zinc-700"
          />
        </label>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg bg-sky-500 text-white font-medium disabled:opacity-50"
        >
          {loading ? "Generowanie planu (to potrwa chwilę)…" : "Wygeneruj plan"}
        </button>
      </form>
    </div>
  );
}
