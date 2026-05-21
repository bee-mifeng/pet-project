import Link from "next/link";
import { Sprout } from "lucide-react";
import { Logo } from "@/components/Logo";

const navItems = [
  { href: "/garden", label: "记忆花园" },
  { href: "/#service", label: "服务说明" },
  { href: "/#faq", label: "常见问题" }
];

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-forest/10 bg-porcelain/88 backdrop-blur-xl">
      <div className="container-shell flex min-h-14 items-center justify-between gap-3 py-2.5 sm:min-h-[4.3rem]">
        <Logo />
        <nav className="flex items-center gap-1.5">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="focus-ring hidden min-h-9 shrink-0 items-center rounded-full px-3 text-sm font-medium text-night/68 transition hover:bg-white/68 hover:text-forest sm:inline-flex"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/create"
            className="focus-ring inline-flex min-h-9 shrink-0 items-center gap-2 rounded-full bg-forest px-3.5 text-sm font-semibold text-cream shadow-quiet transition hover:bg-night sm:px-4"
          >
            <Sprout className="h-4 w-4" />
            开始创建
          </Link>
        </nav>
      </div>
    </header>
  );
}
