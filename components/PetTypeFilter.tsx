"use client";

import type { PetType } from "@/types";
import { cn, petTypeOptions } from "@/lib/utils";

interface PetTypeFilterProps {
  value: PetType | "all";
  onChange: (value: PetType | "all") => void;
}

export function PetTypeFilter({ value, onChange }: PetTypeFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {petTypeOptions.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "focus-ring min-h-11 shrink-0 rounded-full border px-4 text-sm font-semibold transition",
            value === option.value
              ? "border-forest bg-forest text-cream shadow-quiet"
              : "border-forest/12 bg-white text-night/68 hover:border-forest/30 hover:text-forest"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
