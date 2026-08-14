"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Plus, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/trips", label: "Podróże", icon: Home },
  { href: "/trips/new", label: "Nowa", icon: Plus },
  { href: "/profile", label: "Profil", icon: User },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-zinc-200 bg-white/95 backdrop-blur z-40 dark:bg-zinc-950/95 dark:border-zinc-800">
      <ul className="flex items-center justify-around max-w-lg mx-auto">
        {items.map(({ href, label, icon: Icon }) => {
          const active = path === href || (href !== "/trips" && path.startsWith(href));
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-1 py-3 text-xs",
                  active ? "text-sky-500" : "text-zinc-500",
                )}
              >
                <Icon size={22} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
