"use client";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }
  return (
    <button onClick={logout} className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700">
      Wyloguj
    </button>
  );
}
