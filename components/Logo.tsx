import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "default" | "light";
}

export function Logo({ variant = "default" }: LogoProps) {
  const isLight = variant === "light";

  return (
    <Link
      href="/"
      className="focus-ring inline-flex items-center rounded-full"
      aria-label="PawsMeadow 首页"
    >
      <span
        className={cn(
          "inline-flex items-center rounded-full",
          isLight && "bg-cream/95 px-3 py-2 shadow-quiet"
        )}
      >
        <Image
          src="/images/pawsmeadow-logo.png"
          alt=""
          width={458}
          height={132}
          priority
          className={cn("h-12 w-auto object-contain", isLight ? "h-10" : "sm:h-14")}
        />
      </span>
    </Link>
  );
}
