"use client";
import { useState } from "react";
import { ExternalLink, ImageOff, Pencil, Trash2, X, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { mapsUrl } from "@/lib/utils";
import type { Attraction } from "@/lib/types";

type Props = {
  attraction: Attraction;
  onChange: (a: Attraction) => void;
  onDelete: (id: string) => void;
};

export function AttractionCard({ attraction, onChange, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [imgErr, setImgErr] = useState(false);
  const [photoModal, setPhotoModal] = useState(false);
  const [form, setForm] = useState({
    name: attraction.name,
    description: attraction.description ?? "",
    start_time: attraction.start_time ?? "",
    end_time: attraction.end_time ?? "",
    address: attraction.address ?? "",
  });

  const url = attraction.google_maps_url ?? mapsUrl({
    placeId: attraction.google_place_id,
    name: attraction.name,
    address: attraction.address,
  });

  async function save() {
    const supabase = createClient();
    const { data } = await supabase
      .from("attractions")
      .update({
        name: form.name,
        description: form.description || null,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        address: form.address || null,
      })
      .eq("id", attraction.id)
      .select()
      .single();
    if (data) {
      onChange(data as Attraction);
      setEditing(false);
    }
  }

  async function remove() {
    if (!confirm(`Usunąć „${attraction.name}"?`)) return;
    const supabase = createClient();
    await supabase.from("attractions").delete().eq("id", attraction.id);
    onDelete(attraction.id);
  }

  async function updatePhoto(newUrl: string) {
    const supabase = createClient();
    const { data } = await supabase
      .from("attractions")
      .update({ photo_url: newUrl || null, photo_source: "manual" })
      .eq("id", attraction.id)
      .select()
      .single();
    if (data) {
      onChange(data as Attraction);
      setImgErr(false);
      setPhotoModal(false);
    }
  }

  const hasPhoto = attraction.photo_url && !imgErr;

  return (
    <article className="rounded-xl border border-zinc-200 overflow-hidden bg-white dark:bg-zinc-900 dark:border-zinc-800">
      <div className="relative aspect-video bg-zinc-100 dark:bg-zinc-800">
        {hasPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={attraction.photo_url!}
            alt={attraction.name}
            className="w-full h-full object-cover"
            onError={() => setImgErr(true)}
          />
        ) : (
          <button
            onClick={() => setPhotoModal(true)}
            className="w-full h-full flex flex-col items-center justify-center gap-2 text-zinc-400"
          >
            <ImageOff size={28} />
            <span className="text-xs">Kliknij, aby dodać URL zdjęcia</span>
          </button>
        )}
        {hasPhoto && (
          <button
            onClick={() => setPhotoModal(true)}
            className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/60 text-white text-xs"
          >
            Zmień zdjęcie
          </button>
        )}
      </div>

      <div className="p-4 space-y-2">
        {editing ? (
          <div className="space-y-2">
            <input className="w-full px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-transparent"
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <textarea rows={2} className="w-full px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-transparent"
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <input type="time" className="px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-transparent"
                value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
              <input type="time" className="px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-transparent"
                value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
            </div>
            <input className="w-full px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-transparent"
              placeholder="Adres" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <div className="flex gap-2">
              <button onClick={save} className="flex-1 py-2 rounded bg-sky-500 text-white text-sm inline-flex items-center justify-center gap-1">
                <Check size={14} /> Zapisz
              </button>
              <button onClick={() => setEditing(false)} className="flex-1 py-2 rounded border border-zinc-300 dark:border-zinc-700 text-sm inline-flex items-center justify-center gap-1">
                <X size={14} /> Anuluj
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold">{attraction.name}</h3>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => setEditing(true)} className="p-1.5 text-zinc-500 hover:text-sky-500">
                  <Pencil size={16} />
                </button>
                <button onClick={remove} className="p-1.5 text-zinc-500 hover:text-red-500">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            {(attraction.start_time || attraction.end_time) && (
              <p className="text-xs text-zinc-500">
                {attraction.start_time?.slice(0, 5)} – {attraction.end_time?.slice(0, 5)}
              </p>
            )}
            {attraction.description && (
              <p className="text-sm text-zinc-700 dark:text-zinc-300">{attraction.description}</p>
            )}
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm text-sky-500 mt-1"
            >
              <ExternalLink size={14} /> Otwórz w Google Maps
            </a>
          </>
        )}
      </div>

      {photoModal && (
        <PhotoModal
          initial={attraction.photo_url ?? ""}
          onCancel={() => setPhotoModal(false)}
          onSave={updatePhoto}
        />
      )}
    </article>
  );
}

function PhotoModal({ initial, onSave, onCancel }: { initial: string; onSave: (u: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState(initial);
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 p-4 space-y-3">
        <h4 className="font-semibold">Adres URL zdjęcia</h4>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://…"
          className="w-full px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700 bg-transparent"
        />
        <div className="flex gap-2">
          <button onClick={() => onSave(value)} className="flex-1 py-2 rounded bg-sky-500 text-white text-sm">Zapisz</button>
          <button onClick={onCancel} className="flex-1 py-2 rounded border border-zinc-300 dark:border-zinc-700 text-sm">Anuluj</button>
        </div>
      </div>
    </div>
  );
}
