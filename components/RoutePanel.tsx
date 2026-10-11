"use client";

import type { Gym } from "@/lib/types";
import type { GymRoute } from "@/lib/routing";

type Props = {
  gym: Gym;
  route: GymRoute | null;
  status: "locating" | "routing" | "ready" | "error";
  error: string | null;
  startLabel: string;
  onBack: () => void;
  onRetry: () => void;
  onUseSearchPoint: () => void;
};

function distance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

export default function RoutePanel({ gym, route, status, error, startLabel, onBack, onRetry, onUseSearchPoint }: Props) {
  return (
    <div className="route-panel">
      <div className="detail__nav">
        <button type="button" className="ghost-btn" onClick={onBack}>Back to gym</button>
        <span className="route-panel__badge">In-app directions</span>
      </div>
      <header className="detail__head">
        <p className="eyebrow">Driving route · OpenStreetMap roads</p>
        <h2 className="detail__title">To {gym.name}</h2>
        <p className="detail__addr">{gym.address}</p>
      </header>
      {status === "locating" && <p className="route-panel__message" role="status">Allow location access to start directions from where you are. Your coordinates are used for this route only.</p>}
      {status === "routing" && <p className="route-panel__message" role="status">Calculating the road route from {startLabel.toLowerCase()}…</p>}
      {(status === "locating" || status === "routing") && <div className="loading-bar" aria-hidden />}
      {status === "error" && (
        <div className="route-panel__error" role="alert">
          <p>{error}</p>
          <div className="route-panel__actions">
            <button type="button" className="primary-btn" onClick={onRetry}>Try my location</button>
            <button type="button" className="secondary-btn" onClick={onUseSearchPoint}>Use search point</button>
          </div>
          <p className="route-panel__hint">The search point may not be your current location.</p>
        </div>
      )}
      {status === "ready" && route && (
        <>
          <div className="route-panel__summary" role="status">
            <strong>{Math.max(1, Math.round(route.durationSeconds / 60))} min</strong>
            <span>{distance(route.distanceMeters)} · from {startLabel.toLowerCase()}</span>
          </div>
          <p className="route-panel__hint">Estimated route, not live traffic or turn-by-turn GPS navigation. Check road signs and conditions.</p>
          <section className="block route-panel__steps" aria-label="Route steps">
            <h3>Directions</h3>
            {route.steps.length > 0 ? (
              <ol>
                {route.steps.map((step, index) => (
                  <li key={`${index}-${step.instruction}`}>
                    <span>{step.instruction}</span>
                    {step.distanceMeters > 0 && <small>{distance(step.distanceMeters)}</small>}
                  </li>
                ))}
              </ol>
            ) : <p>Follow the highlighted route on the map.</p>}
          </section>
        </>
      )}
      <p className="osm-credit">Route data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>.</p>
    </div>
  );
}
