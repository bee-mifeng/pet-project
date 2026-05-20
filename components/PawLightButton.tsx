"use client";

import { PawPrint } from "lucide-react";

interface PawLightButtonProps {
  count: number;
  onClick: () => void;
}

export function PawLightButton({ count, onClick }: PawLightButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-forest px-5 text-sm font-bold text-cream shadow-quiet transition hover:bg-night"
    >
      <PawPrint className="h-5 w-5" />
      点亮小爪印 {count}
    </button>
  );
}
