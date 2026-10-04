export const MODULE_NAMES = ["CNS", "URS", "REP"] as const;
export type ModuleName = (typeof MODULE_NAMES)[number];
export type GroupSection = "G1" | "G2";
export type UserRole = "super_admin" | "editor" | "student";

export type MaterialCategory =
  | "mindmap"
  | "audio_recording"
  | "reference"
  | "external_link"
  | "qbank"
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
export const THEORY_TYPES: MaterialCategory[] = ["lec_pdf", "record_g1", "record_g2", "mindmap", "audio_recording", "reference", "external_link"];
export const PRACTICAL_TYPES: MaterialCategory[] = ["practical_pdf", "practical_record", "ospe_simulation"];
export const EXAM_TYPES: MaterialCategory[] = ["midterm_study", "midterm_qs", "final_study", "final_qs", "qbank"];

export const MATERIAL_TYPE_LABELS: Record<MaterialCategory, string> = {
  mindmap: "Mind map",
  audio_recording: "Audio recording",
  reference: "Reference",
  external_link: "External link",
  qbank: "Question bank",
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
  subtitle?: string | null;
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
  id: 1;
  announcement_text: string;
  announcement_active: boolean;
  maintenance_mode: boolean;
  ai_enabled: boolean;
  whatsapp_number: string;
  registration_open: boolean;
  support_content: SupportContent;
  site_content: SiteContent;
  updated_at?: string;
}

export interface SiteSection { heading: string; body: string; visible: boolean }
export interface SitePageContent { title: string; description: string; lastUpdated: string; visible: boolean; sections: SiteSection[] }
export interface SiteContent {
  brand: { name: string; shortName: string; tagline: string; description: string; logo: string; affiliation: string; contactEmail: string; teamName: string; foundedYear: string; social: { label: string; url: string }[] };
  navigation: { home: string; modules: string; cns: string; urs: string; rep: string; about: string; contact: string; privacy: string; terms: string; copyright: string };
  navigationOrder: ('home' | 'modules' | 'about' | 'contact')[];
  footer: { explore: string; company: string; legal: string; copyright: string; disclaimer: string };
  home: { headline: string; description: string; tagline: string; ctaPrimary: string; ctaSecondary: string; features: string[] };
  pages: { about: SitePageContent; contact: SitePageContent; privacy: SitePageContent; terms: SitePageContent; copyright: SitePageContent };
  modules: Record<ModuleName, { label: string; summary: string }>;
  auth: { signInTitle: string; signInHelp: string; signUpTitle: string; signUpHelp: string };
  campaigns: { title: string; description: string; cta: string; url: string; discountCode: string; disclosure: string; active: boolean };
}

export interface SupportPaymentMethod {
  id: string;
  title: string;
  value: string;
  display: string;
  action: 'copy' | 'link';
  link_url: string;
  active?: boolean;
}

export interface SupportContent {
  title: string;
  subtitle: string;
  description: string;
  benefit_one: string;
  benefit_two: string;
  payment_heading: string;
  methods: SupportPaymentMethod[];
  copy_label: string;
  copied_label: string;
  link_label: string;
  footer: string;
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
