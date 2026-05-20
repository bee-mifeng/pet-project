"use client";

import { useMemo, useState } from "react";
import type { Memorial, PetType } from "@/types";
import { MemorialCard } from "@/components/MemorialCard";
import { PetTypeFilter } from "@/components/PetTypeFilter";

interface MeadowClientProps {
  memorials: Memorial[];
}

export function MeadowClient({ memorials }: MeadowClientProps) {
  const [filter, setFilter] = useState<PetType | "all">("all");

  const visibleMemorials = useMemo(() => {
    return memorials.filter((memorial) => {
      if (!memorial.isPublic || memorial.status !== "approved") {
        return false;
      }

      return filter === "all" || memorial.type === filter;
    });
  }, [filter, memorials]);

  return (
    <div className="space-y-8">
      <PetTypeFilter value={filter} onChange={setFilter} />
      {visibleMemorials.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visibleMemorials.map((memorial) => (
            <MemorialCard key={memorial.id} memorial={memorial} />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-forest/10 bg-white p-8 text-center shadow-quiet">
          <p className="font-serif text-2xl text-forest">这里暂时还没有通过审核的纪念页</p>
          <p className="mt-3 text-sm leading-6 text-night/58">
            公共记忆花园只展示经过审核的内容，新的申请通过后会出现在这里。
          </p>
        </div>
      )}
    </div>
  );
}
