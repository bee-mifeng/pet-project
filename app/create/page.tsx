import { CreateMemorialForm } from "@/components/CreateMemorialForm";
import { SectionHeader } from "@/components/SectionHeader";

export default function CreatePage() {
  return (
    <main className="bg-grain-soft">
      <section className="container-shell py-10 sm:py-14">
        <SectionHeader
          eyebrow="创建私人纪念页"
          title="先为它留下一页安静的记忆。"
          description="写下它的名字、日期、照片和故事。你可以先生成预览，再决定是否申请公开展示。"
        />
        <CreateMemorialForm />
      </section>
    </main>
  );
}
