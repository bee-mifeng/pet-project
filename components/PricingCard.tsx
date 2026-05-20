import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import type { PricingPlan } from "@/types";
import { cn } from "@/lib/utils";

interface PricingCardProps {
  plan: PricingPlan;
}

export function PricingCard({ plan }: PricingCardProps) {
  return (
    <article
      className={cn(
        "relative flex h-full flex-col rounded-3xl border bg-white p-6 shadow-quiet",
        plan.highlighted
          ? "border-gold shadow-soft ring-2 ring-gold/18"
          : "border-forest/10"
      )}
    >
      {plan.highlighted ? (
        <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full bg-gold/15 px-3 py-1 text-xs font-bold text-night">
          <Sparkles className="h-4 w-4 text-gold" />
          推荐展示服务
        </span>
      ) : null}
      <h3 className="font-serif text-2xl text-forest">{plan.name}</h3>
      <p className="mt-3 text-sm leading-6 text-night/62">{plan.description}</p>
      <p className="mt-6 text-3xl font-bold text-night">{plan.price}</p>
      <ul className="mt-6 flex-1 space-y-3">
        {plan.features.map((feature) => (
          <li key={feature} className="flex gap-3 text-sm leading-6 text-night/70">
            <Check className="mt-0.5 h-5 w-5 shrink-0 text-sage" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <Link
        href="/create"
        className={cn(
          "focus-ring mt-6 inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold transition",
          plan.highlighted
            ? "bg-forest text-cream hover:bg-night"
            : "border border-forest/15 bg-porcelain text-forest hover:border-forest/35 hover:bg-white"
        )}
      >
        选择此方案
      </Link>
    </article>
  );
}
