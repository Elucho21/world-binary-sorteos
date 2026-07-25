// Hand-written types matching supabase/migrations/0001_init.sql.
// Once the project is linked to a live Supabase project, these can be
// regenerated with `supabase gen types typescript --linked` and this file
// replaced wholesale.
//
// IMPORTANT: keep every type below as a `type X = {...}` alias, not an
// `interface`. supabase-js's generic inference for `.from()`/`.rpc()`
// silently collapses to `never` when Row/Insert/Update (or Database itself)
// are declared with `interface` instead of a plain object type alias —
// verified empirically against @supabase/supabase-js 2.110.8.

export type ProfileRole = "super_admin" | "educator";
export type ProfileStatus = "pending" | "approved" | "rejected";
export type SorteoStatus = "draft" | "active" | "paused" | "ended";
export type PrizeCodeStatus = "unassigned" | "available" | "issued" | "redeemed";
export type CodeBatchOrigin = "admin" | "educator";
export type CodeBatchMethod = "file" | "manual";
export type PrizeCodeSource = "admin_bulk" | "educator_csv" | "educator_manual";
export type BannerPlacement = "public_sorteo_page" | "participant_dashboard";

export type Profile = {
  id: string;
  role: ProfileRole;
  status: ProfileStatus;
  display_name: string | null;
  brand_name: string | null;
  avatar_url: string | null;
  created_at: string;
};

export type Sorteo = {
  id: string;
  educator_id: string;
  name: string;
  slug: string;
  description: string | null;
  mechanic_type: string;
  status: SorteoStatus;
  starts_at: string | null;
  ends_at: string | null;
  max_entries: number | null;
  created_at: string;
  updated_at: string;
};

export type WheelSegment = {
  id: string;
  sorteo_id: string;
  label: string;
  color: string;
  weight: number;
  prize_tier: string | null;
  sort_order: number;
  is_active: boolean;
  is_consolation: boolean;
  created_at: string;
};

export type Participant = {
  id: string;
  sorteo_id: string;
  educator_id: string;
  name: string;
  email: string;
  consent: boolean;
  ip_hash: string | null;
  created_at: string;
};

export type CodeBatch = {
  id: string;
  created_by: string;
  educator_id: string;
  origin: CodeBatchOrigin;
  method: CodeBatchMethod;
  total_codes: number;
  created_at: string;
};

export type PrizeCode = {
  id: string;
  educator_id: string;
  segment_id: string | null;
  batch_id: string | null;
  code: string;
  status: PrizeCodeStatus;
  created_by: string;
  source: PrizeCodeSource;
  issued_to: string | null;
  issued_at: string | null;
  redeemed_at: string | null;
  created_at: string;
};

export type Entry = {
  id: string;
  participant_id: string;
  sorteo_id: string;
  segment_id: string;
  prize_code_id: string | null;
  spun_at: string;
};

export type AdminSettings = {
  id: true;
  site_name: string;
  support_email: string | null;
  updated_at: string;
};

export type Banner = {
  id: string;
  title: string;
  image_url: string;
  link_url: string | null;
  placement: BannerPlacement;
  is_active: boolean;
  sort_order: number;
  starts_at: string | null;
  ends_at: string | null;
  created_by: string | null;
  created_at: string;
};

export type PublicSorteo = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: SorteoStatus;
  starts_at: string | null;
  ends_at: string | null;
  educator_display_name: string | null;
  educator_brand_name: string | null;
};

export type PublicWheelSegment = {
  id: string;
  sorteo_id: string;
  label: string;
  color: string;
  sort_order: number;
};

export type ActiveBanner = {
  id: string;
  title: string;
  image_url: string;
  link_url: string | null;
  placement: BannerPlacement;
  sort_order: number;
};

export type MyEntry = {
  entry_id: string;
  spun_at: string;
  sorteo_name: string;
  sorteo_slug: string;
  educator_display_name: string | null;
  educator_brand_name: string | null;
  segment_label: string;
  code: string | null;
  code_status: PrizeCodeStatus | null;
  redeemed_at: string | null;
};

export type SpinWheelResult = {
  already_played: boolean;
  segment_id: string | null;
  segment_label: string;
  code: string | null;
};

export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile> & { id: string }; Update: Partial<Profile>; Relationships: [] };
      sorteos: { Row: Sorteo; Insert: Partial<Sorteo> & { educator_id: string; name: string; slug: string }; Update: Partial<Sorteo>; Relationships: [] };
      wheel_segments: { Row: WheelSegment; Insert: Partial<WheelSegment> & { sorteo_id: string; label: string }; Update: Partial<WheelSegment>; Relationships: [] };
      participants: { Row: Participant; Insert: Partial<Participant>; Update: Partial<Participant>; Relationships: [] };
      code_batches: { Row: CodeBatch; Insert: Partial<CodeBatch> & { created_by: string; educator_id: string; origin: CodeBatchOrigin; method: CodeBatchMethod }; Update: Partial<CodeBatch>; Relationships: [] };
      prize_codes: { Row: PrizeCode; Insert: Partial<PrizeCode> & { educator_id: string; code: string; created_by: string; source: PrizeCodeSource }; Update: Partial<PrizeCode>; Relationships: [] };
      entries: { Row: Entry; Insert: Partial<Entry>; Update: Partial<Entry>; Relationships: [] };
      admin_settings: { Row: AdminSettings; Insert: Partial<AdminSettings>; Update: Partial<AdminSettings>; Relationships: [] };
      banners: { Row: Banner; Insert: Partial<Banner> & { title: string; image_url: string; placement: BannerPlacement }; Update: Partial<Banner>; Relationships: [] };
    };
    Views: {
      public_sorteos: { Row: PublicSorteo; Relationships: [] };
      public_wheel_segments: { Row: PublicWheelSegment; Relationships: [] };
      active_banners: { Row: ActiveBanner; Relationships: [] };
      my_entries: { Row: MyEntry; Relationships: [] };
    };
    Functions: {
      spin_wheel: {
        Args: { p_slug: string; p_name: string; p_email: string; p_honeypot?: string; p_ip_hash?: string | null };
        Returns: SpinWheelResult;
      };
      is_super_admin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
