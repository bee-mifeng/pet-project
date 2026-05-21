import type { PetType, ReviewStatus } from "@/types";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export const petTypeLabels: Record<PetType, string> = {
  cat: "猫咪",
  dog: "狗狗",
  other: "其他"
};

export const petTypeOptions: Array<{ label: string; value: PetType | "all" }> = [
  { label: "全部", value: "all" },
  { label: "猫咪", value: "cat" },
  { label: "狗狗", value: "dog" },
  { label: "其他", value: "other" }
];

export const statusLabels: Record<ReviewStatus, string> = {
  private: "私人纪念页",
  pending: "待审核",
  approved: "已通过",
  rejected: "已拒绝"
};

export function statusTone(status: ReviewStatus) {
  if (status === "private") {
    return "bg-forest/10 text-forest ring-forest/15";
  }

  if (status === "approved") {
    return "bg-sage/15 text-forest ring-sage/20";
  }

  if (status === "rejected") {
    return "bg-rosewood/10 text-rosewood ring-rosewood/20";
  }

  return "bg-gold/15 text-night ring-gold/25";
}
