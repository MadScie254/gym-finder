"use client";

import { directionsUrl, formatPrice, starText } from "@/lib/format";
import { photoUrl } from "@/lib/placesClient";
import type { Gym } from "@/lib/types";

type GymDetailProps = {
  gym: Gym;
  saved: boolean;
  loadingDetails: boolean;
  onClose: () => void;
  onToggleSave: () => void;
};

export default function GymDetail({
  gym,
  saved,
  loadingDetails,
  onClose,
  onToggleSave,
}: GymDetailProps) {
  const photo = photoUrl(gym.photoName);
  const mapsLink =
    gym.googleMapsUri ?? directionsUrl(gym.location.lat, gym.location.lng, gym.name);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-white/10 px-3 py-1 text-sm text-slate-200"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onToggleSave}
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            saved ? "bg-lime-300 text-black" : "bg-white/10 text-slate-200"
          }`}
        >
          {saved ? "Saved" : "Save"}
        </button>
      </div>

      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo}
          alt={gym.name}
          className="mt-3 h-40 w-full rounded-2xl object-cover"
        />
      ) : (
        <div className="mt-3 flex h-32 items-center justify-center rounded-2xl bg-white/5 text-sm text-slate-500">
          No photo available
        </div>
      )}

      <h2 className="mt-4 text-2xl font-semibold text-white">{gym.name}</h2>
      <p className="mt-1 text-sm text-slate-400">{gym.address}</p>
      <p className="mt-2 text-sm text-slate-200">
        {starText(gym.rating, gym.userRatingCount)}
        {formatPrice(gym.priceLevel) ? ` · ${formatPrice(gym.priceLevel)}` : ""}
        {gym.openNow != null ? ` · ${gym.openNow ? "Open now" : "Closed"}` : ""}
      </p>

      {gym.editorialSummary && (
        <p className="mt-3 text-sm leading-6 text-slate-300">{gym.editorialSummary}</p>
      )}

      {loadingDetails && (
        <p className="mt-3 text-xs text-slate-500">Loading hours, reviews, and contacts…</p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <a
          href={mapsLink}
          target="_blank"
          rel="noreferrer"
          className="rounded-xl bg-lime-300 px-3 py-3 text-center text-sm font-semibold text-black"
        >
          Directions
        </a>
        {gym.phone ? (
          <a
            href={`tel:${gym.phone}`}
            className="rounded-xl bg-white/10 px-3 py-3 text-center text-sm font-semibold text-white"
          >
            Call
          </a>
        ) : (
          <span className="rounded-xl bg-white/5 px-3 py-3 text-center text-sm text-slate-500">
            No phone
          </span>
        )}
      </div>

      {gym.website && (
        <a
          href={gym.website}
          target="_blank"
          rel="noreferrer"
          className="mt-2 rounded-xl bg-white/10 px-3 py-3 text-center text-sm font-semibold text-white"
        >
          Website
        </a>
      )}

      {gym.weekdayHours.length > 0 && (
        <section className="mt-5">
          <h3 className="text-sm font-semibold text-white">Hours</h3>
          <ul className="mt-2 space-y-1 text-sm text-slate-400">
            {gym.weekdayHours.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      )}

      {gym.reviews.length > 0 && (
        <section className="mt-5">
          <h3 className="text-sm font-semibold text-white">Reviews</h3>
          <ul className="mt-2 space-y-3">
            {gym.reviews.slice(0, 3).map((review, index) => (
              <li key={`${gym.id}-review-${index}`} className="rounded-xl bg-white/5 p-3 text-sm text-slate-300">
                {review.rating != null && (
                  <p className="mb-1 text-xs text-lime-300">{review.rating.toFixed(1)} stars</p>
                )}
                {review.text}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
