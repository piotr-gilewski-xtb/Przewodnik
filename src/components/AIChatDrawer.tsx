"use client";
import { useState } from "react";
import { X, Send } from "lucide-react";
import { useRouter } from "next/navigation";

type Msg = { role: "user" | "assistant"; content: string };

export function AIChatDrawer({ tripId, open, onClose }: { tripId: string; open: boolean; onClose: () => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "assistant", content: "Cześć! Zaproponuję atrakcje albo dodam je do planu. Powiedz, czego szukasz." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const next = [...msgs, { role: "user" as const, content: text }];
    setMsgs(next);
    setLoading(true);
    const res = await fetch("/api/agent/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tripId, messages: next }),
    });
    setLoading(false);
    if (!res.ok) {
      setMsgs([...next, { role: "assistant", content: "Coś poszło nie tak. Spróbuj ponownie." }]);
      return;
    }
    const { reply, planChanged } = await res.json();
    setMsgs([...next, { role: "assistant", content: reply }]);
    if (planChanged) router.refresh();
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center">
      <div className="w-full sm:max-w-md h-[85dvh] sm:h-[75dvh] bg-white dark:bg-zinc-900 rounded-t-2xl sm:rounded-2xl flex flex-col">
        <header className="flex items-center justify-between p-3 border-b border-zinc-200 dark:border-zinc-800">
          <h3 className="font-semibold">Agent AI</h3>
          <button onClick={onClose} className="p-1 text-zinc-500"><X size={20} /></button>
        </header>
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {msgs.map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-right" : ""}>
              <div className={`inline-block px-3 py-2 rounded-2xl max-w-[85%] text-sm whitespace-pre-wrap ${
                m.role === "user" ? "bg-sky-500 text-white" : "bg-zinc-100 dark:bg-zinc-800"
              }`}>{m.content}</div>
            </div>
          ))}
          {loading && <p className="text-xs text-zinc-500">Piszę…</p>}
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); send(); }}
          className="p-3 border-t border-zinc-200 dark:border-zinc-800 flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Zaproponuj coś dla dzieci na dzień 2…"
            className="flex-1 px-3 py-2 rounded-full border border-zinc-300 dark:border-zinc-700 bg-transparent"
          />
          <button type="submit" disabled={loading} className="p-2 rounded-full bg-sky-500 text-white disabled:opacity-50">
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
