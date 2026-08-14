"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Collab = { user_id: string | null; invited_email: string | null; role: string };

export function InviteForm({ tripId, initial }: { tripId: string; initial: Collab[] }) {
  const [collabs, setCollabs] = useState(initial);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    const supabase = createClient();
    // Look up user by email in profiles (requires the email to match a signed-in user's profile)
    const { data: userRow } = await supabase
      .from("profiles")
      .select("id")
      .eq("display_name", email.split("@")[0])
      .maybeSingle();
    const insertRow: Record<string, unknown> = { trip_id: tripId, role: "editor" };
    if (userRow?.id) insertRow.user_id = userRow.id;
    else insertRow.invited_email = email;
    const { error } = await supabase.from("trip_collaborators").insert(insertRow);
    if (error) {
      setStatus(error.message);
      return;
    }
    setCollabs([...collabs, insertRow as Collab]);
    setEmail("");
    setStatus("Zaproszono");
  }

  return (
    <div className="space-y-4">
      <form onSubmit={invite} className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email uczestnika"
          className="flex-1 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent"
        />
        <button className="px-4 py-2 rounded-lg bg-sky-500 text-white text-sm">Zaproś</button>
      </form>
      {status && <p className="text-sm text-zinc-500">{status}</p>}
      <ul className="space-y-2">
        {collabs.map((c, i) => (
          <li key={i} className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 text-sm flex justify-between">
            <span>{c.invited_email ?? c.user_id}</span>
            <span className="text-zinc-500">{c.role}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-zinc-500">
        Uczestnik musi zalogować się tym adresem email w aplikacji — po zalogowaniu automatycznie zobaczy zaproszony plan.
      </p>
    </div>
  );
}
