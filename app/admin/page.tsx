import { AdminReviewTable } from "@/components/AdminReviewTable";
import { SectionHeader } from "@/components/SectionHeader";

export default function AdminPage() {
  return (
    <main className="bg-grain-soft">
      <section className="container-shell py-10 sm:py-14">
        <SectionHeader
          eyebrow="Mock Admin"
          title="简单后台审核页"
          description="用于演示待审核、已通过、已拒绝和留言审核的状态切换。当前不连接真实数据库。"
        />
        <AdminReviewTable />
      </section>
    </main>
  );
}
