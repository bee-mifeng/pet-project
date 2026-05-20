import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Logo } from "@/components/Logo";

export function Footer() {
  return (
    <footer className="border-t border-forest/10 bg-night text-cream">
      <div className="container-shell grid gap-8 py-10 md:grid-cols-[1.2fr_1fr]">
        <div className="space-y-4">
          <Logo variant="light" />
          <p className="max-w-xl text-sm leading-7 text-cream/72">
            PawsMeadow 是一个温柔的宠物数字纪念空间。你可以创建私密纪念页，也可以申请进入公共记忆花园，让它被看见、被祝福、被温柔记住。
          </p>
          <p className="inline-flex items-center gap-2 rounded-full border border-cream/15 px-3 py-2 text-xs text-cream/70">
            <ShieldCheck className="h-4 w-4 text-gold" />
            审核制公开展示，避免攀比式互动
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div className="space-y-3">
            <p className="font-semibold text-cream">页面</p>
            <Link className="block text-cream/70 hover:text-cream" href="/create">
              创建纪念页
            </Link>
            <Link className="block text-cream/70 hover:text-cream" href="/meadow">
              记忆花园
            </Link>
            <Link className="block text-cream/70 hover:text-cream" href="/#service">
              服务说明
            </Link>
            <Link className="block text-cream/70 hover:text-cream" href="/#faq">
              常见问题
            </Link>
          </div>
          <div className="space-y-3">
            <p className="font-semibold text-cream">规则</p>
            <Link className="block text-cream/70 hover:text-cream" href="#">
              内容审核说明
            </Link>
            <Link className="block text-cream/70 hover:text-cream" href="#">
              用户协议
            </Link>
            <Link className="block text-cream/70 hover:text-cream" href="#">
              隐私政策
            </Link>
          </div>
          <div className="space-y-3">
            <p className="font-semibold text-cream">服务</p>
            <span className="block text-cream/70">私人纪念页</span>
            <span className="block text-cream/70">公共记忆花园</span>
            <span className="block text-cream/70">二维码纪念卡</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
