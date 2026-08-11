import type { BlocksPackage, LessonPackage } from "./caselab-package";

export const EXAMPLE_LESSON: LessonPackage = {
  caselab_version: "2.0",
  package_type: "lesson",
  mode: "standard",
  lesson: {
    title: "Konformitet og gruppepres",
    subject: "Psykologi",
    duration_minutes: 60,
    learning_goal:
      "Eleverne skal kunne anvende begreber om konformitet på konkrete situationer fra hverdagen.",
    teacher_note: "Klassen kender allerede Asch fra sidste modul.",
    tags: ["socialpsykologi", "konformitet"],
    blocks: [
      {
        type: "dilemma",
        title: "Ville du sige imod?",
        duration_minutes: 8,
        student_instructions: "Tag stilling, og vær klar til at begrunde dit valg.",
        teacher_notes: "Brug 2 minutter på at samle op på begrundelserne.",
        content: {
          scenario:
            "Din vennegruppe har besluttet at droppe fredagens gruppearbejde. Du synes, det er en dårlig idé.",
          question: "Siger du din holdning højt?",
          options: ["Ja, jeg siger det direkte", "Nej, jeg holder det for mig selv"],
          require_justification: true,
        },
      },
      {
        type: "teacher_content",
        title: "Konformitet og Asch",
        duration_minutes: 12,
        student_instructions: "Tag noter til de tre begreber på tavlen.",
        teacher_notes: "Tegn Aschs linjeforsøg på tavlen.",
        content: {
          body: "Konformitet er tilpasning af egen adfærd eller holdning til en gruppes normer. Skeln mellem normativ social indflydelse (ønsket om at høre til) og informativ social indflydelse (ønsket om at have ret). Aschs linjeforsøg viste, at ca. en tredjedel af svarene fulgte gruppens tydeligt forkerte vurdering.",
        },
      },
      {
        type: "case",
        title: "Emma starter hos NOVA",
        duration_minutes: 18,
        student_instructions: "Arbejd i par. Skriv korte, begrundede svar.",
        teacher_notes: "Saml op på spørgsmål 3 i plenum.",
        content: {
          scenario:
            "Emma er ny elev i 2.X. I klassens gruppechat gør de andre grin med en lærer. Emma synes ikke, det er sjovt, men sender alligevel en grinende emoji.",
          questions: [
            "Hvilken type social indflydelse er på spil hos Emma?",
            "Hvad ville skulle ændre sig, for at Emma sagde fra?",
            "Hvordan kan en klasse mindske normativt pres?",
          ],
        },
      },
      {
        type: "theory_test",
        title: "Test teorien på en ny situation",
        duration_minutes: 10,
        student_instructions: "Vælg det svar, du mener passer bedst, og begrund det.",
        teacher_notes: null,
        content: {
          theory: "Aschs konformitetsforsøg",
          scenario:
            "En elev ændrer sit svar i en quiz, efter at fire klassekammerater har svaret noget andet.",
          question: "Hvilken forklaring passer bedst?",
          options: ["Normativ social indflydelse", "Informativ social indflydelse"],
          follow_up_questions: [
            "Hvad ville afgøre, hvilken forklaring der er rigtig?",
            "Hvordan kunne man teste det?",
          ],
        },
      },
      {
        type: "discussion",
        title: "Er konformitet altid et problem?",
        duration_minutes: 8,
        student_instructions: "Diskutér i grupper på tre.",
        teacher_notes: null,
        content: {
          prompt:
            "Konformitet får os til at følge gruppen. Men samfund kræver også, at vi følger fælles normer.",
          follow_up_questions: [
            "Hvornår er konformitet nyttigt?",
            "Hvornår bliver det farligt?",
          ],
        },
      },
      {
        type: "exit_ticket",
        title: "Dagens udbytte",
        duration_minutes: 4,
        student_instructions: "Svar kort og individuelt.",
        teacher_notes: null,
        content: {
          questions: [
            "Forklar konformitet med dine egne ord.",
            "Giv ét eksempel fra din egen hverdag.",
          ],
        },
      },
    ],
  },
};

export const EXAMPLE_BLOCKS: BlocksPackage = {
  caselab_version: "2.0",
  package_type: "blocks",
  blocks: [
    {
      type: "poll",
      title: "Hvor ofte følger du flertallet?",
      duration_minutes: 5,
      student_instructions: "Vælg det svar, der passer bedst på dig.",
      teacher_notes: "Vis resultatet, og spørg to elever hvorfor.",
      content: {
        question: "Hvor ofte ændrer du mening, fordi flertallet mener noget andet?",
        options: ["Næsten aldrig", "Nogle gange", "Ofte"],
      },
    },
    {
      type: "case",
      title: "Gruppearbejdet der gik skævt",
      duration_minutes: 15,
      student_instructions: "Arbejd i par, og skriv jeres svar ned.",
      teacher_notes: null,
      content: {
        scenario:
          "En gruppe på fire skal aflevere en opgave. Tre er enige om en løsning, som den fjerde ved er forkert. Han siger ingenting.",
        questions: [
          "Hvorfor siger han ingenting?",
          "Hvilke begreber kan forklare situationen?",
        ],
      },
    },
    {
      type: "exit_ticket",
      title: "Kort opsamling",
      duration_minutes: 5,
      student_instructions: "Svar individuelt.",
      teacher_notes: null,
      content: {
        questions: ["Hvad tager du med fra i dag?", "Hvad er du stadig i tvivl om?"],
      },
    },
  ],
};
