import Link from "next/link";
import { MessageCircle, ShieldCheck } from "lucide-react";
import { AdminNotice } from "@/components/AdminNotice";
import { SectionHeader } from "@/components/SectionHeader";

const adminLinks = [
  {
    href: "/admin/memorials",
    title: "纪念页公开申请",
    description: "审核申请进入公共记忆花园的纪念页。",
    icon: ShieldCheck
  },
  {
    href: "/admin/messages",
    title: "留言审核",
    description: "审核访客提交的留言祝福。",
    icon: MessageCircle
  }
];

export default function AdminPage() {
  return (
    <main className="bg-grain-soft">
      <section className="container-shell py-10 sm:py-14">
        <SectionHeader
          eyebrow="内部审核"
          title="审核入口"
          description="公开展示和留言都需要先经过审核，让公共空间保持安静、温柔。"
        />
        <AdminNotice />
        <div className="grid gap-4 sm:grid-cols-2">
          {adminLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="focus-ring rounded-3xl border border-forest/10 bg-white p-5 shadow-quiet transition hover:-translate-y-0.5 hover:shadow-soft"
            >
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-forest text-cream">
                <item.icon className="h-5 w-5" />
              </span>
              <h2 className="mt-4 font-serif text-2xl text-forest">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-night/60">
                {item.description}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
