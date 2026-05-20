"use client";

import { Flower2 } from "lucide-react";

interface FlowerButtonProps {
  count: number;
  onClick: () => void;
}

export function FlowerButton({ count, onClick }: FlowerButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-gold px-5 text-sm font-bold text-night shadow-quiet transition hover:brightness-105"
    >
      <Flower2 className="h-5 w-5" />
      献花 {count}
    </button>
  );
}
