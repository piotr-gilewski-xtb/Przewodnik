const UA = "PrzewodnikPodrozy/1.0 (contact: dev@example.com)";

export type PlaceResult = {
  placeId: string;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  wikipediaKey?: string;
};

type NominatimHit = {
  osm_id: number;
  osm_type: string;
  display_name: string;
  name?: string;
  lat: string;
  lon: string;
  extratags?: { wikipedia?: string; image?: string };
};

export async function searchPlaces(query: string, locationBias?: string): Promise<PlaceResult[]> {
  const q = encodeURIComponent(locationBias ? `${query}, ${locationBias}` : query);
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=5&extratags=1`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, "Accept-Language": "pl,en" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const hits: NominatimHit[] = await res.json();
    return hits.map((h) => ({
      placeId: `${h.osm_type}:${h.osm_id}`,
      name: h.name || h.display_name.split(",")[0],
      address: h.display_name,
      lat: parseFloat(h.lat),
      lng: parseFloat(h.lon),
      wikipediaKey: h.extratags?.image ?? h.extratags?.wikipedia,
    }));
  } catch {
    return [];
  }
}

export async function fetchPhoto(nameOrKey: string): Promise<string | undefined> {
  if (nameOrKey.startsWith("http")) return nameOrKey;
  const [lang, ...rest] = nameOrKey.includes(":") ? nameOrKey.split(":") : ["en", nameOrKey];
  const title = rest.join(":") || nameOrKey;
  try {
    const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(3000) });
    if (!res.ok) return undefined;
    const j = await res.json();
    return j.thumbnail?.source ?? j.originalimage?.source;
  } catch {
    return undefined;
  }
}
