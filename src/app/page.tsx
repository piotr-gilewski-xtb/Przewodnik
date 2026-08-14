import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/trips");
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-6 text-center gap-6">
      <h1 className="text-3xl font-bold">Przewodnik podróży</h1>
      <p className="max-w-md text-zinc-600">
        Zaplanuj wycieczkę z pomocą AI: wpisz miasto, daty i preferencje — dostaniesz gotowy plan zwiedzania z mapą.
      </p>
      <Link href="/login" className="px-6 py-3 rounded-full bg-sky-500 text-white font-medium">
        Zaloguj się
      </Link>
    </main>
  );
}
