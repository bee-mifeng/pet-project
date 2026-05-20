export type PetType = "cat" | "dog" | "other";

export type ReviewStatus = "pending" | "approved" | "rejected";

export interface Memorial {
  id: string;
  name: string;
  type: PetType;
  avatar: string;
  years: string;
  departedDate: string;
  birthOrAdoptedDate: string;
  story: string;
  message: string;
  flowersCount: number;
  pawLightsCount: number;
  commentsCount: number;
  isPublic: boolean;
  status: ReviewStatus;
  gallery: string[];
}

export interface MemorialComment {
  id: string;
  memorialId: string;
  author: string;
  content: string;
  createdAt: string;
  status: ReviewStatus;
}

export interface PricingPlan {
  name: string;
  price: string;
  description: string;
  features: string[];
  highlighted?: boolean;
}
