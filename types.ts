export const MODULE_NAMES = ["CNS", "URS", "REP"] as const;
export type ModuleName = (typeof MODULE_NAMES)[number];
export type GroupSection = "G1" | "G2";
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

/** Safely convert a URL segment like "cns" into a ModuleName, or null. */
export function parseModuleName(value: string | undefined | null): ModuleName | null {
  const upper = (value ?? "").toUpperCase();
  return (MODULE_NAMES as readonly string[]).includes(upper) ? (upper as ModuleName) : null;
}

export interface Material {
  id: string;
  module: ModuleName;
  type: MaterialCategory;
  title: string;
  file_url: string;
  created_at: string;
}

export interface Student {
  id: string;
  email: string;
  name: string;
  group_section: GroupSection;
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
