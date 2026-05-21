export type PetType = "cat" | "dog" | "other";
export type MemorialReviewStatus = "private" | "pending" | "approved" | "rejected";
export type MessageReviewStatus = "pending" | "approved" | "rejected";
export type InteractionType = "flower" | "paw_light";

export interface MemorialRow {
  id: string;
  slug: string;
  pet_name: string;
  pet_type: PetType;
  birth_or_adopted_date: string | null;
  passed_date: string | null;
  story: string | null;
  message: string | null;
  photo_url: string | null;
  is_public: boolean;
  allow_messages: boolean;
  review_status: MemorialReviewStatus;
  flowers_count: number;
  paw_lights_count: number;
  created_at: string;
  updated_at: string;
}

export interface MessageRow {
  id: string;
  memorial_id: string;
  visitor_name: string | null;
  content: string;
  review_status: MessageReviewStatus;
  created_at: string;
}

export interface InteractionRow {
  id: string;
  memorial_id: string;
  type: InteractionType;
  visitor_key: string | null;
  created_at: string;
}

export type MemorialInsert = Omit<
  MemorialRow,
  "id" | "created_at" | "updated_at" | "flowers_count" | "paw_lights_count"
> &
  Partial<Pick<MemorialRow, "flowers_count" | "paw_lights_count">>;

export type MemorialUpdate = Partial<
  Omit<MemorialRow, "id" | "slug" | "created_at" | "updated_at">
>;

export type MessageInsert = Omit<MessageRow, "id" | "created_at">;
export type MessageUpdate = Partial<Omit<MessageRow, "id" | "created_at">>;
export type InteractionInsert = Omit<InteractionRow, "id" | "created_at">;

export interface Database {
  public: {
    Tables: {
      memorials: {
        Row: MemorialRow;
        Insert: MemorialInsert;
        Update: MemorialUpdate;
        Relationships: [];
      };
      messages: {
        Row: MessageRow;
        Insert: MessageInsert;
        Update: MessageUpdate;
        Relationships: [];
      };
      interactions: {
        Row: InteractionRow;
        Insert: InteractionInsert;
        Update: Partial<InteractionInsert>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
