import { Flower2 } from "lucide-react";
import { MeadowClient } from "@/components/MeadowClient";
import { SectionHeader } from "@/components/SectionHeader";
import { memorials } from "@/data/memorials";

export default function MeadowPage() {
  return (
    <main className="bg-grain-soft">
      <section className="container-shell py-10 sm:py-14">
        <SectionHeader
          eyebrow="审核制展示空间"
          title="公共记忆花园"
          description="每一个被爱过的毛孩子，都值得被温柔记住。这里只展示经过审核的宠物纪念页，让浏览与祝福保持安静、克制。"
          action={
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-forest/12 bg-white px-3 py-2 text-xs font-semibold text-forest">
              <Flower2 className="h-4 w-4 text-gold" />
              审核后展示 · 温柔祝福
            </span>
          }
        />
        <MeadowClient memorials={memorials} />
      </section>
    </main>
  );
}
