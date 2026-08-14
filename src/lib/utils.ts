import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function mapsUrl(opts: { placeId?: string | null; name?: string; address?: string | null }) {
  const query = encodeURIComponent([opts.name, opts.address].filter(Boolean).join(" "));
  const base = `https://www.google.com/maps/search/?api=1&query=${query}`;
  return opts.placeId ? `${base}&query_place_id=${opts.placeId}` : base;
}

export function eachDate(start: string, end: string): string[] {
  const out: string[] = [];
  const s = new Date(start);
  const e = new Date(end);
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}
