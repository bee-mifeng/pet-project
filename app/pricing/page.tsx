import { ShieldCheck } from "lucide-react";
import { PricingCard } from "@/components/PricingCard";
import { SectionHeader } from "@/components/SectionHeader";
import { pricingPlans } from "@/data/memorials";

export default function PricingPage() {
  return (
    <main className="bg-grain-soft">
      <section className="container-shell py-10 sm:py-14">
        <SectionHeader
          eyebrow="公共记忆花园展示服务"
          title="私人纪念页可免费创建，是否公开展示由你决定。"
          description="当你希望它进入公共记忆花园时，可申请展示服务。费用用于人工审核、页面展示与基础维护。"
        />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {pricingPlans.map((plan) => (
            <PricingCard key={plan.name} plan={plan} />
          ))}
        </div>
        <div className="mt-8 rounded-3xl border border-forest/10 bg-white p-5 shadow-quiet">
          <p className="inline-flex items-center gap-2 font-semibold text-forest">
            <ShieldCheck className="h-5 w-5 text-sage" />
            商业边界说明
          </p>
          <p className="mt-3 text-sm leading-7 text-night/64">
            不设置持续扣费，也不设计删除压力；公开展示与留言仍需要审核，互动只用于表达祝福。
          </p>
        </div>
      </section>
    </main>
  );
}
