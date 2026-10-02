export const MODULE_NAMES = ["CNS", "URS", "REP"] as const;
export type ModuleName = (typeof MODULE_NAMES)[number];
export type GroupSection = "G1" | "G2";
export type UserRole = "super_admin" | "editor" | "student";

export type MaterialCategory =
  | "lec_pdf"
  | "record_g1"
  | "record_g2"
  | "practical_pdf"
  | "practical_record"
  | "midterm_study"
  | "midterm_qs"
  | "final_study"
  | "final_qs"
  | "ospe_simulation";

/** Matches the CHECK constraint on public.materials.format */
export type MaterialFormat = "pdf" | "audio" | "external_link";
/** Matches the CHECK constraint on public.materials.source_type */
export type MaterialSource = "supabase" | "drive" | "telegram";

/** Safely convert a URL segment like "cns" or "urinary" into a ModuleName, or null. */
export function parseModuleName(value: string | undefined | null): ModuleName | null {
  const upper = (value ?? "").toUpperCase();
  if (upper === "URINARY" || upper === "UROGENITAL") return "URS";
  return (MODULE_NAMES as readonly string[]).includes(upper) ? (upper as ModuleName) : null;
}

export const MODULE_TITLES: Record<ModuleName, string> = {
  CNS: "Central Nervous System",
  URS: "Urinary System",
  REP: "Reproductive System",
};

/** Single source of truth for categories: used by the module page, viewer and admin form. */
export const THEORY_TYPES: MaterialCategory[] = ["lec_pdf", "record_g1", "record_g2"];
export const PRACTICAL_TYPES: MaterialCategory[] = ["practical_pdf", "practical_record", "ospe_simulation"];
export const EXAM_TYPES: MaterialCategory[] = ["midterm_study", "midterm_qs", "final_study", "final_qs"];

export const MATERIAL_TYPE_LABELS: Record<MaterialCategory, string> = {
  lec_pdf: "Lecture PDF",
  record_g1: "Record G1",
  record_g2: "Record G2",
  practical_pdf: "Practical PDF",
  practical_record: "Practical Record",
  ospe_simulation: "OSPE Simulation",
  midterm_study: "Midterm Study Guide",
  midterm_qs: "Midterm Questions",
  final_study: "Final Study Guide",
  final_qs: "Final Questions",
};

export interface Material {
  id: string;
  module: ModuleName;
  type: MaterialCategory;
  title: string;
  file_url: string;
  /** Present in the database (default 'external_link'). */
  format?: MaterialFormat;
  source_type?: MaterialSource | null;
  /** Present in our extended metadata */
  created_at?: string;
  updated_at?: string;
  author_email?: string;
  /** Nullable lecture-level Gemini source material and quiz bank. */
  ai_context?: string | null;
  raw_quiz_text?: string | null;
  custom_system_prompt?: string | null;
}

export interface Student {
  id: string;
  email: string;
  name: string;
  group_section: GroupSection;
  role?: UserRole;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  group_section: GroupSection;
  role: UserRole;
  created_at?: string;
}

export interface PlatformSettings {
  siteName: string;
  announcement: string;
  showAnnouncement: boolean;
  maintenanceMode: boolean;
  allowRegistrations: boolean;
  supportWhatsApp: string;
}

export interface AdCampaign {
  id: string;
  title: string;
  brand: string;
  badge: string;
  tagline: string;
  description: string;
  discountCode?: string;
  ctaText: string;
  ctaUrl: string;
  active: boolean;
  variant: "revive" | "academic" | "medova" | "qbank" | "stethoscope" | "fellowship";
}

export interface QuizQuestionResult {
  question_id: string;
  topic: string;
  is_correct: boolean;
  student_answer: string;
  correct_answer: string;
}

export interface AIReport {
  strengths: string[];
  weaknesses: string[];
  study_recommendations: string[];
  summary_message: string;
}

export interface QuizAttempt {
  id: string;
  student_id: string;
  module: ModuleName;
  quiz_title: string;
  score: number;
  total_questions: number;
  breakdown: QuizQuestionResult[];
  ai_feedback: AIReport | null;
  submitted_at: string;
}
