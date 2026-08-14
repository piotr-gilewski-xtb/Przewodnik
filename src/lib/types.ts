export type Preferences = {
  nature?: boolean;
  architecture?: boolean;
  museums?: boolean;
  food?: boolean;
  nightlife?: boolean;
  shopping?: boolean;
  history?: boolean;
  family?: boolean;
  adventure?: boolean;
};

export const PREFERENCE_LABELS: { key: keyof Preferences; label: string }[] = [
  { key: "nature", label: "Natura" },
  { key: "architecture", label: "Architektura" },
  { key: "museums", label: "Muzea" },
  { key: "food", label: "Jedzenie" },
  { key: "nightlife", label: "Życie nocne" },
  { key: "shopping", label: "Zakupy" },
  { key: "history", label: "Historia" },
  { key: "family", label: "Dla rodziny" },
  { key: "adventure", label: "Przygoda" },
];

export type Trip = {
  id: string;
  owner_id: string;
  destination: string;
  start_date: string;
  end_date: string;
  preferences: Preferences;
  notes: string | null;
  status: string;
  created_at: string;
};

export type PlanDay = {
  id: string;
  trip_id: string;
  day_date: string;
  position: number;
};

export type Attraction = {
  id: string;
  plan_day_id: string;
  name: string;
  description: string | null;
  start_time: string | null;
  end_time: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  google_place_id: string | null;
  google_maps_url: string | null;
  photo_url: string | null;
  photo_source: string | null;
  position: number;
};
