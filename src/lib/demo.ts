import { supabase } from "@/integrations/supabase/client";
import { createClass, createLesson, createUnit } from "./data";
import { blockDef } from "./blocks";

interface DemoBlock {
  type: string;
  title: string;
  duration_minutes: number;
  student_instructions?: string;
  teacher_notes?: string;
  content: Record<string, unknown>;
}

const demoBlocks: DemoBlock[] = [
  {
    type: "dilemma",
    title: "Ville du sige imod gruppen?",
    duration_minutes: 8,
    student_instructions: "Vælg dit svar og skriv en kort begrundelse.",
    content: {
      scenario:
        "Du sidder i en gruppe, hvor alle andre svarer klart forkert på et spørgsmål, du kender svaret på.",
      question: "Hvad gør du?",
      options: ["Jeg siger min mening", "Jeg følger gruppen", "Jeg siger ingenting"],
      require_justification: true,
    },
  },
  {
    type: "teacher_content",
    title: "Konformitet og Asch",
    duration_minutes: 12,
    teacher_notes: "Brug tavlen til at tegne forsøgsopstillingen.",
    content: {
      body: "Gennemgang af Aschs linjeforsøg, normativ og informativ social indflydelse samt gruppepres i hverdagen.",
    },
  },
  {
    type: "case",
    title: "Emma starter hos NOVA",
    duration_minutes: 20,
    student_instructions: "Arbejd i grupper af tre og noter jeres svar.",
    content: {
      scenario:
        "Emma er nyansat hos NOVA. På hendes første møde griner alle ad en kollega, og Emma griner med, selvom hun synes, det er ubehageligt.",
      questions: [
        "Hvilke former for social indflydelse er på spil?",
        "Hvad ville få Emma til at handle anderledes?",
      ],
    },
  },
  {
    type: "theory_test",
    title: "Test teorien på en ny situation",
    duration_minutes: 15,
    content: {
      theory: "Aschs konformitetsforsøg",
      scenario: "En klasse skal stemme om en fælles udflugt, og den første elev svarer højt.",
      question: "Hvilken type indflydelse forklarer bedst resultatet?",
      options: ["Normativ indflydelse", "Informativ indflydelse"],
      follow_up_questions: ["Hvordan kunne afstemningen designes anderledes?"],
    },
  },
  {
    type: "discussion",
    title: "Hvornår er konformitet et problem?",
    duration_minutes: 15,
    content: {
      prompt: "Er det altid dårligt at følge gruppen?",
      follow_up_questions: ["Hvor går grænsen mellem samarbejde og gruppepres?"],
    },
  },
  {
    type: "exit_ticket",
    title: "Exit ticket",
    duration_minutes: 5,
    content: {
      questions: ["Nævn ét begreb du tager med fra i dag", "Hvad er du stadig i tvivl om?"],
    },
  },
];

export async function loadDemoData(): Promise<string> {
  const { data: userData } = await supabase.auth.getUser();
  const teacher_id = userData.user?.id;
  if (!teacher_id) throw new Error("Du er ikke logget ind.");

  const psyk = await createClass({
    name: "2.X",
    subject: "Psykologi",
    school_year: "2025/2026",
    notes: "Demoklasse oprettet af CaseLab.",
  });
  await createClass({ name: "1.Y", subject: "Samfundsfag", school_year: "2025/2026" });
  await createClass({ name: "3.Z", subject: "Organisation", school_year: "2025/2026" });

  const unit = await createUnit({
    class_id: psyk.id,
    title: "Socialpsykologi",
    description: "Gruppepres, konformitet og social indflydelse.",
    status: "active",
    sort_order: 0,
  });

  const lesson = await createLesson({
    class_id: psyk.id,
    unit_id: unit.id,
    title: "Konformitet og gruppepres",
    subject: psyk.subject,
    duration_minutes: 90,
    learning_goal: "Eleverne kan anvende begreberne konformitet og social indflydelse på cases.",
  });

  const { error } = await supabase.from("lesson_blocks").insert(
    demoBlocks.map((b, i) => ({
      lesson_id: lesson.id,
      teacher_id,
      block_order: i,
      type: b.type,
      title: b.title || blockDef(b.type).label,
      duration_minutes: b.duration_minutes,
      student_instructions: b.student_instructions ?? null,
      teacher_notes: b.teacher_notes ?? null,
      content: b.content as never,
    })),
  );
  if (error) throw new Error(error.message);

  return lesson.id;
}
