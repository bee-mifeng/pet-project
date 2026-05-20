import type { ReactNode } from "react";

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action
}: SectionHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="mb-3 text-sm font-semibold text-gold">{eyebrow}</p>
        ) : null}
        <h2 className="font-serif text-3xl text-forest sm:text-4xl">{title}</h2>
        {description ? (
          <p className="mt-3 text-base leading-7 text-night/68">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
