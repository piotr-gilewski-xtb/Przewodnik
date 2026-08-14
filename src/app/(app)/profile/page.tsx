import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/LogoutButton";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Profil</h1>
      <p className="text-sm text-zinc-600">Zalogowany jako <b>{user?.email}</b></p>
      <LogoutButton />
    </div>
  );
}
