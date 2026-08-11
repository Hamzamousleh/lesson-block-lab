export type UnitStatus = "planned" | "active" | "completed";
export type LessonStatus = "draft" | "ready" | "completed";
export type LessonMode = "standard" | "rescue";

export interface TeacherClass {
  id: string;
  teacher_id: string;
  name: string;
  subject: string;
  school_year: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Unit {
  id: string;
  teacher_id: string;
  class_id: string;
  title: string;
  description: string | null;
  status: UnitStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Lesson {
  id: string;
  teacher_id: string;
  class_id: string;
  unit_id: string | null;
  title: string;
  subject: string | null;
  duration_minutes: number;
  learning_goal: string | null;
  teacher_note: string | null;
  lesson_date: string | null;
  status: LessonStatus;
  mode: LessonMode;
  created_at: string;
  updated_at: string;
}

export interface LessonBlock {
  id: string;
  lesson_id: string;
  teacher_id: string;
  block_order: number;
  type: string;
  title: string;
  duration_minutes: number;
  student_instructions: string | null;
  teacher_notes: string | null;
  content: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export const UNIT_STATUS_LABEL: Record<UnitStatus, string> = {
  planned: "Planlagt",
  active: "Aktivt",
  completed: "Afsluttet",
};

export const LESSON_STATUS_LABEL: Record<LessonStatus, string> = {
  draft: "Kladde",
  ready: "Klar",
  completed: "Afholdt",
};
