"use client";

import GymCard from "./GymCard";
import type { Gym } from "@/lib/types";

type GymListProps = {
  gyms: Gym[];
  selectedId: string | null;
  favorites: string[];
  emptyMessage: string;
  onSelect: (id: string) => void;
  onToggleSave: (id: string) => void;
};

export default function GymList({
  gyms,
  selectedId,
  favorites,
  emptyMessage,
  onSelect,
  onToggleSave,
}: GymListProps) {
  if (gyms.length === 0) {
    return <p className="px-1 py-8 text-center text-sm text-slate-400">{emptyMessage}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {gyms.map((gym) => (
        <GymCard
          key={gym.id}
          gym={gym}
          selected={gym.id === selectedId}
          saved={favorites.includes(gym.id)}
          onSelect={() => onSelect(gym.id)}
          onToggleSave={() => onToggleSave(gym.id)}
        />
      ))}
    </div>
  );
}
