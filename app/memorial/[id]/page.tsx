import { notFound } from "next/navigation";
import { MemorialDetailClient } from "@/components/MemorialDetailClient";
import { memorials } from "@/data/memorials";

export function generateStaticParams() {
  return memorials.map((memorial) => ({ id: memorial.id }));
}

export default async function MemorialPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const query = searchParams ? await searchParams : {};
  const memorial = memorials.find((item) => item.id === id);

  if (!memorial) {
    notFound();
  }

  return (
    <MemorialDetailClient memorial={memorial} created={query.created === "1"} />
  );
}
