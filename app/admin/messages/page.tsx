import { AdminMessagesClient } from "@/components/AdminMessagesClient";
import { AdminNotice } from "@/components/AdminNotice";
import { SectionHeader } from "@/components/SectionHeader";

export default function AdminMessagesPage() {
  return (
    <main className="bg-grain-soft">
      <section className="container-shell py-10 sm:py-14">
        <SectionHeader
          eyebrow="内部审核"
          title="留言审核"
          description="只展示正在等待审核的访客留言。"
        />
        <AdminNotice />
        <AdminMessagesClient />
      </section>
    </main>
  );
}
