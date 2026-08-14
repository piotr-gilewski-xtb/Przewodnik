# Przewodnik — planer podróży z AI

Mobile-first webowa aplikacja z **w pełni darmowym stackiem**: tworzy plan zwiedzania (dni, atrakcje, godziny, linki Google Maps, miniatury) na podstawie AI, z historią podróży, edycją, regeneracją, agentem AI i współedycją.

## Stack (100% darmowy dla hobby)

- **Next.js 15** (App Router, TypeScript, Tailwind CSS v4) — deploy na **Vercel Hobby** (darmowy)
- **Supabase Free** — Postgres + Auth (magic link) + Realtime + RLS
- **Groq** (Llama 3.3 70B) — darmowy tier z limitem tokenów/minutę, szybki (function calling)
- **OpenStreetMap Nominatim** + **Wikipedia REST API** — darmowe źródło miejsc i zdjęć (bez klucza)
- **Google Maps** — używamy tylko linków `maps.google.com/?q=...` (nie potrzebuje klucza)

## Setup (5 kroków, wszystko darmowe)

1. **Supabase** → utwórz projekt na https://supabase.com (Free tier, bez karty).
   - W SQL Editor wklej `supabase/migrations/0001_init.sql` i uruchom.
   - Skopiuj `Project URL`, `anon key`, `service_role key` (Settings → API).
2. **Groq** → załóż konto na https://console.groq.com (darmowe, bez karty), wygeneruj API key.
3. `cp .env.local.example .env.local` i uzupełnij:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   GROQ_API_KEY=...
   ```
4. `npm install && npm run dev` → http://localhost:3000
5. **Vercel deploy** (patrz sekcja niżej).

## Deploy na Vercel (darmowy)

**Wariant A — przez GitHub (rekomendowany):**

```bash
git add -A && git commit -m "Initial"
gh repo create przewodnik --private --source=. --push   # lub ręcznie na github.com
```

Potem na https://vercel.com/new:
1. Zaloguj się GitHubem, zaimportuj repo.
2. W Environment Variables dodaj te same 4 zmienne co lokalnie.
3. Deploy → dostajesz URL `https://przewodnik-xxx.vercel.app`.
4. Wróć do Supabase → Authentication → URL Configuration → dodaj URL Vercela do „Site URL" i „Redirect URLs" (`https://twoj-app.vercel.app/auth/callback`).

**Wariant B — Vercel CLI:**

```bash
npm i -g vercel
vercel login
vercel        # dev deploy
vercel --prod # produkcja
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# ... powtórz dla każdej zmiennej
```

## Struktura

```
src/
  app/
    (app)/               # chronione: /trips, /trips/new, /trips/[id], /profile
    api/
      trips/generate         # POST — Groq tool-use + OSM -> zapis planu
      trips/[id]/regenerate  # POST — usuwa dni i generuje od nowa
      agent/chat             # POST — agent AI (search_places + add_attraction)
    auth/callback            # magic link callback
    login/
  components/            # TripView, AttractionCard, AIChatDrawer, InviteForm, BottomNav
  lib/
    supabase/{client,server,middleware}.ts
    ai/{client,generate}.ts     # Groq
    osm/places.ts               # Nominatim + Wikipedia
    utils.ts, types.ts
supabase/migrations/     # SQL + RLS
```

## Funkcje

- **Kreator podróży**: daty, kierunek, preferencje (natura/architektura/muzea/jedzenie/…), must-see.
- **AI generacja**: Llama iteruje `search_places` (OSM) → `submit_plan` → backend dokleja adresy, współrzędne, zdjęcia z Wikipedii, linki Google Maps.
- **Podmiana zdjęcia**: jeśli miniatura nie ładuje → modal z URL (`photo_source='manual'`).
- **Edycja / dodawanie / usuwanie atrakcji** inline w karcie.
- **Regeneracja** planu jednym przyciskiem.
- **Agent AI** w drawerze — proponuje i dodaje atrakcje bezpośrednio do planu.
- **Współedycja**: zaproszenia po e-mailu + Realtime sync.
- **Mobile-first / PWA**.

## Uwagi o limitach darmowych tierów

- **Groq**: ~30 req/min i limit tokenów dziennie — dla osobistego użytku wystarczy z zapasem.
- **Nominatim**: max 1 req/s (przestrzegamy przez User-Agent + niską częstotliwość); do intensywnego użytku warto postawić własny instance.
- **Supabase Free**: 500 MB DB, 50 000 MAU, 5 GB transferu.
- **Vercel Hobby**: 100 GB bandwidth, tylko projekty niekomercyjne.
