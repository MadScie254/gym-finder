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
    return <p className="empty-copy">{emptyMessage}</p>;
  }

  return (
    <div className="gym-list">
      {gyms.map((gym, index) => (
        <GymCard
          key={gym.id}
          gym={gym}
          index={index}
          selected={gym.id === selectedId}
          saved={favorites.includes(gym.id)}
          onSelect={() => onSelect(gym.id)}
          onToggleSave={() => onToggleSave(gym.id)}
        />
      ))}
    </div>
  );
}
