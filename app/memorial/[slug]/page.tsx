import { MemorialDetailClient } from "@/components/MemorialDetailClient";

export default async function MemorialPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <MemorialDetailClient slug={slug} />;
}
