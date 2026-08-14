const UA = "PrzewodnikPodrozy/1.0 (contact: dev@example.com)";

export type PlaceResult = {
  placeId: string;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  photoUrl?: string;
};

type NominatimHit = {
  place_id: number;
  osm_id: number;
  osm_type: string;
  display_name: string;
  name?: string;
  lat: string;
  lon: string;
  extratags?: { wikipedia?: string; wikidata?: string; image?: string };
};

export async function searchPlaces(query: string, locationBias?: string): Promise<PlaceResult[]> {
  const q = encodeURIComponent(locationBias ? `${query}, ${locationBias}` : query);
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=5&addressdetails=1&extratags=1`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "pl,en" } });
    if (!res.ok) return [];
    const hits: NominatimHit[] = await res.json();
    const results = await Promise.all(
      hits.map(async (h) => {
        const name = h.name || h.display_name.split(",")[0];
        let photoUrl: string | undefined = h.extratags?.image;
        if (!photoUrl && h.extratags?.wikipedia) {
          photoUrl = await wikipediaThumb(h.extratags.wikipedia);
        }
        if (!photoUrl) photoUrl = await wikipediaThumb(`en:${name}`);
        return {
          placeId: `${h.osm_type}:${h.osm_id}`,
          name,
          address: h.display_name,
          lat: parseFloat(h.lat),
          lng: parseFloat(h.lon),
          photoUrl,
        } satisfies PlaceResult;
      }),
    );
    return results;
  } catch {
    return [];
  }
}

async function wikipediaThumb(langTitle: string): Promise<string | undefined> {
  const [lang, ...rest] = langTitle.includes(":") ? langTitle.split(":") : ["en", langTitle];
  const title = rest.join(":") || langTitle;
  try {
    const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) return undefined;
    const j = await res.json();
    return j.thumbnail?.source ?? j.originalimage?.source;
  } catch {
    return undefined;
  }
}
