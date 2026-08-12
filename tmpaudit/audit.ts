import * as P from "../src/lib/prompt";
import { validatePackage } from "../src/lib/caselab-package";
const b: [string,string,string][] = [];
const chk=(n:string,exp:string,s:string)=>{
  const okType = s.includes(`"package_type": "${exp}"`) && !s.includes(`"type": "lesson"`) && !s.includes(`"type": "blocks"`);
  const nest = exp!=="lesson" || (s.includes('"lesson": {') && s.match(/"blocks": \[/g)!.length>=1 && !/\n  "blocks":/.test(s));
  b.push([n, exp, okType&&nest?"PASS":"FAIL"]);
};
chk("Planlæg undervisning (lesson)","lesson",P.buildLessonPrompt({topic:"x",duration:90,feels:[],material:""} as any));
chk("Planlæg undervisning (blocks)","blocks",P.buildBlocksPrompt({topic:"x",minutes:20,needs:[],material:""} as any));
chk("Brug mit materiale (lesson)","lesson",P.buildMaterialPrompt({material:"m",materialKind:"Noter",purpose:"p",duration:90,outputType:"lesson",feels:[],subject:"Psykologi"}));
chk("Brug mit materiale (blocks)","blocks",P.buildMaterialPrompt({material:"m",materialKind:"Noter",purpose:"p",duration:30,outputType:"blocks",feels:[]}));
chk("Brug mit materiale (quiz)","blocks",P.buildMaterialPrompt({material:"m",materialKind:"Noter",purpose:"p",duration:30,outputType:"quiz",feels:[]}));
chk("Red mig (rescue)","lesson",P.buildRescuePrompt({topic:"x",duration:90,material:""} as any));
chk("Jeg mangler tid","blocks",P.buildExtraTimePrompt({minutes:15,want:"case"} as any));
chk("Gør lektionen mere aktiv","blocks",P.buildImprovePrompt({lessonTitle:"L",duration:90,blockDetail:"-",wishes:[],freeText:""} as any));
chk("Differentiering","blocks",P.buildDifferentiatePrompt({levels:["Støtte"],sourceText:"s",minutes:20} as any));
chk("Arbejd videre med svarene","blocks",P.buildFollowUpPrompt({lessonTitle:"L",blockTitle:"B",blockType:"poll",question:"q",responseSummary:"r",intent:"deepen",minutes:20,anonymized:true} as any));
chk("Klasseplanlægning","lesson",P.buildClassPlanningPrompt({className:"2.X",overview:"o",notes:"",focus:"f",duration:90}));
chk("World creation","world",P.buildWorldPrompt({title:"T",subject:"S",worldTypeLabel:"w",academicFocus:"a",premiseIdea:""}));
chk("Next World Episode","world_episode",P.buildNextEpisodePrompt({worldTitle:"W",subject:"S",premise:"p",academicFocus:"a",stateLines:[],historyLines:[],previousEpisodes:[],complexityLabel:"c",intention:"i",concepts:"k",duration:90,episodeNumber:2}));
chk("World reflection","lesson",P.buildWorldReflectionPrompt({worldTitle:"W",subject:"S",premise:"p",startLines:[],endLines:[],decisionLines:[],duration:90}));
chk("Konsekvens-refleksion","blocks",P.buildConsequenceReflectionPrompt({worldTitle:"W",subject:"S",episodeTitle:"E",learningGoal:"g",decision:"d",distribution:"x",changeLines:[],academicRationale:"r",duration:20}));
for(const r of b) console.log(r[2].padEnd(5), r[0], "->", r[1]);

// import validation of canonical samples
const lesson={caselab_version:"2.0",package_type:"lesson",mode:"standard",lesson:{title:"Konformitet",subject:"Psykologi",duration_minutes:90,learning_goal:"g",teacher_note:"n",blocks:[{type:"teacher_content",title:"Intro",duration_minutes:10,student_instructions:"",teacher_notes:"",content:{body:"tekst"}},{type:"case",title:"Case",duration_minutes:40,student_instructions:"",teacher_notes:"",content:{scenario:"s",questions:["a","b"]}},{type:"exit_ticket",title:"Exit",duration_minutes:40,student_instructions:"",teacher_notes:"",content:{questions:["q"]}}]}};
const quiz={caselab_version:"2.0",package_type:"blocks",blocks:[{type:"theory_test",title:"Quiz",duration_minutes:15,student_instructions:"",teacher_notes:"",content:{theory:"t",scenario:"s",question:"q",options:["a","b"],follow_up_questions:["f"],correct_option_index:1,feedback:{correct:"ja",incorrect:"nej"}}}]};
for(const [n,pkg] of [["lesson",lesson],["quiz-blocks",quiz]] as const){
  const r=validatePackage(JSON.stringify(pkg));
  console.log("VALIDATE",n,r.ok?"OK":"ERR",r.ok?JSON.stringify(r).slice(0,220):(r as any).errors);
}
