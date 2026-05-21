import { AdminMemorialsClient } from "@/components/AdminMemorialsClient";
import { AdminNotice } from "@/components/AdminNotice";
import { SectionHeader } from "@/components/SectionHeader";

export default function AdminMemorialsPage() {
  return (
    <main className="bg-grain-soft">
      <section className="container-shell py-10 sm:py-14">
        <SectionHeader
          eyebrow="内部审核"
          title="纪念页公开申请"
          description="只展示正在等待审核的公开申请。"
        />
        <AdminNotice />
        <AdminMemorialsClient />
      </section>
    </main>
  );
}
