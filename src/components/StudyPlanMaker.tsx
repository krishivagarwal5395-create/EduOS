import React, { useState, useEffect } from "react";
import { 
  Calendar, Clock, AlertTriangle, CheckCircle2, Bookmark, Download, 
  Printer, Sparkles, RefreshCw, Zap, BookOpen, Coffee, Flame, 
  ChevronRight, ChevronLeft, ArrowRight, ShieldAlert, Check, Trophy
} from "lucide-react";
import { PersonalizedStudyPlan, StudyPlanWeek, StudyPlanDay, SavedItem, CustomInstructions } from "../types";

interface StudyPlanMakerProps {
  savedMaterials: SavedItem[];
  customInstructions: CustomInstructions;
  onSaveItem: (type: 'exam-study-plan', title: string, data: PersonalizedStudyPlan) => void;
}

// Built-in preloaded master study plan specifically tailored for:
// 3 Weeks, Math, Science & History, 2 hours/day, Weak in Algebra & Photosynthesis, Revision Days & Short Breaks
const DEFAULT_3_WEEK_PLAN: PersonalizedStudyPlan = {
  planTitle: "3-Week Intensive Exam Revision Masterplan",
  overview: "Personalized 21-day study schedule allocating exactly 2 hours per day across Math, Science, and History. Heavy emphasis on mastering weak foundations in Algebra (Equations, Factoring, Graphing) and Photosynthesis (Light & Dark Reactions, Chloroplast Anatomy), integrated with structured 10-15 minute cognitive breaks and 5 dedicated revision days.",
  dailyHours: 2,
  totalWeeks: 3,
  subjects: ["Mathematics (Focus: Algebra)", "Science (Focus: Photosynthesis)", "History"],
  weakAreas: ["Algebra (Math)", "Photosynthesis (Science)"],
  dailyBreakSchedule: "Session 1 (50 mins) ➔ 10-15 min Refresh Break (hydration & stretch) ➔ Session 2 (50 mins) ➔ 10 min Spaced Recall Wrap-up",
  milestones: [
    "End of Week 1: Complete conceptual mastery of Linear Equations & Photosynthesis light reactions; baseline history timeline built.",
    "End of Week 2: Quadratic equations & Calvin Cycle fluency achieved; multi-chapter cross-subject practice questions completed.",
    "End of Week 3: Timed full-length mock exams completed; peak confidence and stress-free exam readiness."
  ],
  tips: [
    "Strict 50/10 Rule: Step away from screens during the 10-minute break. Physical movement boosts brain oxygenation.",
    "Active Recall Over Re-reading: Close your notes and test yourself on formulas and biochemical cycles.",
    "The 24-Hour Review: Spend the first 5 minutes of each session reviewing what was learned the previous day.",
    "Feynman Technique for Photosynthesis: Explain the electron transport chain in simple language without jargon."
  ],
  weeks: [
    {
      weekNumber: 1,
      weekGoal: "Week 1: Core Foundation & Weak Area Turnaround",
      days: [
        {
          day: "Day 1 (Monday)",
          isRevisionDay: false,
          breakTime: "10-15 min physical stretch & water break",
          dailyNotes: "Focus on fundamentals. Do not skip the 10-minute break.",
          sessions: [
            {
              timeSlot: "5:00 PM - 5:50 PM (50 min)",
              subject: "Math (Weak Area)",
              topic: "Algebra: Solving 1-Step and 2-Step Linear Equations",
              isWeakAreaFocus: true,
              activities: [
                "Review inverse operations (addition/subtraction, multiplication/division)",
                "Solve 15 foundational algebraic equations with step-by-step verification",
                "Flag any sign errors (+/- rules)"
              ]
            },
            {
              timeSlot: "6:05 PM - 6:55 PM (50 min)",
              subject: "Science (Weak Area)",
              topic: "Photosynthesis: Leaf Structure & Chloroplast Anatomy",
              isWeakAreaFocus: true,
              activities: [
                "Sketch and label a plant leaf cross-section (stomata, mesophyll cells)",
                "Draw chloroplast anatomy: thylakoids, grana, stroma, and chlorophyll pigment",
                "Write the overall balanced chemical formula: 6CO2 + 6H2O + light -> C6H12O6 + 6O2"
              ]
            }
          ]
        },
        {
          day: "Day 2 (Tuesday)",
          isRevisionDay: false,
          breakTime: "10 min brisk walk away from study desk",
          dailyNotes: "History introduction balanced with Algebra reinforcement.",
          sessions: [
            {
              timeSlot: "5:00 PM - 5:50 PM (50 min)",
              subject: "History",
              topic: "Core Historical Era Overview & Chronological Timeline",
              isWeakAreaFocus: false,
              activities: [
                "Create a visual master timeline with major key dates and pivotal events",
                "Highlight key historical figures, causes, and treaties/milestones",
                "Self-test on 5 critical cause-and-effect sequences"
              ]
            },
            {
              timeSlot: "6:05 PM - 6:55 PM (50 min)",
              subject: "Math (Weak Area)",
              topic: "Algebra: Multi-Step Equations with Variables on Both Sides",
              isWeakAreaFocus: true,
              activities: [
                "Distributive property practice: a(bx + c) = d",
                "Combine like terms drill (12 problems)",
                "Identify identity equations vs no-solution paradoxes"
              ]
            }
          ]
        },
        {
          day: "Day 3 (Wednesday)",
          isRevisionDay: false,
          breakTime: "10-15 min eyes-closed relaxation break",
          dailyNotes: "Deep-dive into Science weak spot: Light-Dependent Reactions.",
          sessions: [
            {
              timeSlot: "5:00 PM - 5:50 PM (50 min)",
              subject: "Science (Weak Area)",
              topic: "Photosynthesis: Light-Dependent Reactions & Photolysis",
              isWeakAreaFocus: true,
              activities: [
                "Trace the path of sunlight photons exciting chlorophyll electrons",
                "Explain water photolysis: H2O splitting into H+, electrons, and O2 byproduct",
                "Understand ATP & NADPH energy carriers generation in thylakoid membrane"
              ]
            },
            {
              timeSlot: "6:05 PM - 6:55 PM (50 min)",
              subject: "History",
              topic: "Primary Source Documents & Key Historical Turning Points",
              isWeakAreaFocus: false,
              activities: [
                "Analyze 2 sample primary source passages or speeches",
                "Identify bias, context, audience, and historical significance",
                "Write 3 summary bullet points per document"
              ]
            }
          ]
        },
        {
          day: "Day 4 (Thursday)",
          isRevisionDay: false,
          breakTime: "10 min healthy snack (fruits/nuts) & hydration",
          dailyNotes: "Connecting algebraic formulas to graphing.",
          sessions: [
            {
              timeSlot: "5:00 PM - 5:50 PM (50 min)",
              subject: "Math (Weak Area)",
              topic: "Algebra: Linear Inequalities & Graphing Solutions on Number Lines",
              isWeakAreaFocus: true,
              activities: [
                "Solve one-variable inequalities: flip inequality sign when multiplying/dividing by negatives",
                "Graph open vs closed circles on number lines",
                "Compound inequalities: AND vs OR practice (8 problems)"
              ]
            },
            {
              timeSlot: "6:05 PM - 6:55 PM (50 min)",
              subject: "Science (Weak Area)",
              topic: "Photosynthesis: Light-Independent Reactions (Calvin Cycle)",
              isWeakAreaFocus: true,
              activities: [
                "Location: Stroma of the chloroplast",
                "Carbon fixation role of RuBisCO enzyme",
                "How ATP and NADPH reduce 3-PGA into G3P to manufacture glucose",
                "Compare inputs and outputs table of Light vs Dark reactions"
              ]
            }
          ]
        },
        {
          day: "Day 5 (Friday)",
          isRevisionDay: false,
          breakTime: "10-15 min music break",
          dailyNotes: "History & Math interleaving.",
          sessions: [
            {
              timeSlot: "5:00 PM - 5:50 PM (50 min)",
              subject: "History",
              topic: "Socio-Economic Impacts, Governments & Cultural Shifts",
              isWeakAreaFocus: false,
              activities: [
                "Map economic factors (trade, resources, taxes, industrial growth)",
                "Review governance models and constitutional reforms",
                "Create comparative table of major factions or alliances"
              ]
            },
            {
              timeSlot: "6:05 PM - 6:55 PM (50 min)",
              subject: "Math (Weak Area)",
              topic: "Algebra: Slope-Intercept Form (y = mx + b) & Graphing Lines",
              isWeakAreaFocus: true,
              activities: [
                "Calculate slope m = (y2 - y1) / (x2 - x1)",
                "Identify y-intercept and plot 5 linear equations on coordinate plane",
                "Convert standard form (Ax + By = C) into slope-intercept form"
              ]
            }
          ]
        },
        {
          day: "Day 6 (Saturday)",
          isRevisionDay: false,
          breakTime: "15 min fresh-air walk",
          dailyNotes: "Experimental science & word problems.",
          sessions: [
            {
              timeSlot: "10:00 AM - 10:50 AM (50 min)",
              subject: "Science (Weak Area)",
              topic: "Photosynthesis Experiments: Light Intensity, CO2 & Temperature Factors",
              isWeakAreaFocus: true,
              activities: [
                "Analyze rate of photosynthesis graphs (limiting factors plateau)",
                "Review classic experiments: Elodea waterweed oxygen bubble counting",
                "Starch iodine leaf test (destarching in dark vs light-exposed leaves)"
              ]
            },
            {
              timeSlot: "11:05 AM - 11:55 AM (50 min)",
              subject: "Math (Weak Area)",
              topic: "Algebra: Real-World Word Problems & Translation",
              isWeakAreaFocus: true,
              activities: [
                "Translate English phrases into algebraic expressions (e.g. '5 less than twice x')",
                "Solve 6 real-world word problems (distance/speed, consecutive integers, costs)",
                "Check solutions against real-world reasonableness"
              ]
            }
          ]
        },
        {
          day: "Day 7 (Sunday)",
          isRevisionDay: true,
          breakTime: "20 min restorative relaxation & reward break",
          dailyNotes: "DEDICATED REVISION DAY 1: Week 1 Consolidation & Self-Testing.",
          sessions: [
            {
              timeSlot: "10:00 AM - 10:50 AM (50 min)",
              subject: "Consolidated Revision",
              topic: "Week 1 Cumulative Self-Test: Algebra & Photosynthesis",
              isWeakAreaFocus: true,
              activities: [
                "Complete a 30-minute closed-book quiz covering Days 1-6 topics",
                "Grade with answer key and identify remaining weak spots",
                "Re-solve every single incorrect question immediately"
              ]
            },
            {
              timeSlot: "11:10 AM - 12:00 PM (50 min)",
              subject: "Consolidated Revision",
              topic: "History Review & Weak Area Flashcards",
              isWeakAreaFocus: false,
              activities: [
                "Rapid-fire review of Week 1 History timeline and key terms",
                "Create summary cheat-sheet / formula card for Algebra rules",
                "Create visual summary diagram of Photosynthesis inputs & outputs"
              ]
            }
          ]
        }
      ]
    },
    {
      weekNumber: 2,
      weekGoal: "Week 2: Advanced Mastery, Cross-Topic Fluency & Problem Solving",
      days: [
        {
          day: "Day 8 (Monday)",
          isRevisionDay: false,
          breakTime: "10 min stretch & hydration",
          dailyNotes: "Systems of equations and cellular respiration comparison.",
          sessions: [
            {
              timeSlot: "5:00 PM - 5:50 PM (50 min)",
              subject: "Math (Weak Area)",
              topic: "Algebra: Systems of Linear Equations (Substitution Method)",
              isWeakAreaFocus: true,
              activities: [
                "Solve 8 systems of 2 linear equations using substitution",
                "Check for intersecting lines (1 solution), parallel (0), coinciding (infinite)",
                "Word problem application: 2-variable setup"
              ]
            },
            {
              timeSlot: "6:05 PM - 6:55 PM (50 min)",
              subject: "Science",
              topic: "Photosynthesis vs Cellular Respiration Comparison",
              isWeakAreaFocus: true,
              activities: [
                "Create side-by-side comparison table: site, reactants, products, energy conversion",
                "Explain the complementary cyclical relationship between plants and animals",
                "Carbon cycle overview in ecosystems"
              ]
            }
          ]
        },
        {
          day: "Day 9 (Tuesday)",
          isRevisionDay: false,
          breakTime: "10-15 min mindful breathing break",
          dailyNotes: "History essay outlines and algebraic elimination.",
          sessions: [
            {
              timeSlot: "5:00 PM - 5:50 PM (50 min)",
              subject: "History",
              topic: "Key Historical Debates, Causes and Short/Long-Term Consequences",
              isWeakAreaFocus: false,
              activities: [
                "Outline 2 long-form essay questions: thesis statement + 3 body paragraphs",
                "Memorize 5 high-impact quotes or statistical facts to back arguments",
                "Review common exam rubric marking criteria"
              ]
            },
            {
              timeSlot: "6:05 PM - 6:55 PM (50 min)",
              subject: "Math (Weak Area)",
              topic: "Algebra: Systems of Equations (Elimination / Addition Method)",
              isWeakAreaFocus: true,
              activities: [
                "Multiply equations to align coefficients for elimination",
                "Solve 8 advanced elimination problems",
                "Verify solutions by plugging back into original equations"
              ]
            }
          ]
        },
        {
          day: "Day 10 (Wednesday)",
          isRevisionDay: false,
          breakTime: "10 min screen-off rest",
          dailyNotes: "Polynomials and plant adaptations.",
          sessions: [
            {
              timeSlot: "5:00 PM - 5:50 PM (50 min)",
              subject: "Science (Weak Area)",
              topic: "Photosynthesis Adaptations: C3, C4, and CAM Plants",
              isWeakAreaFocus: true,
              activities: [
                "Why photorespiration occurs in hot, dry climates",
                "How C4 plants (corn, sugarcane) spatially separate carbon fixation",
                "How CAM plants (cacti, pineapple) temporally open stomata at night"
              ]
            },
            {
              timeSlot: "6:05 PM - 6:55 PM (50 min)",
              subject: "Math (Weak Area)",
              topic: "Algebra: Polynomials & Factoring (GCF and Grouping)",
              isWeakAreaFocus: true,
              activities: [
                "Add, subtract, and multiply polynomials (FOIL method)",
                "Factor out Greatest Common Factor (GCF) from 10 expressions",
                "Factor by grouping for 4-term polynomials"
              ]
            }
          ]
        },
        {
          day: "Day 11 (Thursday)",
          isRevisionDay: false,
          breakTime: "10-15 min light movement",
          dailyNotes: "History treaties and quadratic factoring.",
          sessions: [
            {
              timeSlot: "5:00 PM - 5:50 PM (50 min)",
              subject: "History",
              topic: "International Treaties, Alliances, and Geopolitical Realignments",
              isWeakAreaFocus: false,
              activities: [
                "Flashcard review of 15 key historical treaties and pacts",
                "Trace geographical border changes on blank reference maps",
                "Practice 5 multiple-choice exam questions under 10-minute timer"
              ]
            },
            {
              timeSlot: "6:05 PM - 6:55 PM (50 min)",
              subject: "Math (Weak Area)",
              topic: "Algebra: Factoring Quadratics (x^2 + bx + c and ax^2 + bx + c)",
              isWeakAreaFocus: true,
              activities: [
                "Find factors of c that sum to b technique",
                "Solve quadratics by setting factors equal to zero (Zero Product Property)",
                "Difference of squares formula: a^2 - b^2 = (a - b)(a + b)"
              ]
            }
          ]
        },
        {
          day: "Day 12 (Friday)",
          isRevisionDay: false,
          breakTime: "10 min fruit & water recharge",
          dailyNotes: "Science laboratory questions & Quadratic formula.",
          sessions: [
            {
              timeSlot: "5:00 PM - 5:50 PM (50 min)",
              subject: "Science",
              topic: "Experimental Data Analysis & Past Exam Free-Response Questions",
              isWeakAreaFocus: true,
              activities: [
                "Interpret data tables of gas exchange rates",
                "Graph dependent vs independent variables (time vs O2 produced)",
                "Write 2 full-sentence scientific hypotheses and conclusions"
              ]
            },
            {
              timeSlot: "6:05 PM - 6:55 PM (50 min)",
              subject: "Math (Weak Area)",
              topic: "Algebra: The Quadratic Formula & Discriminant Analysis",
              isWeakAreaFocus: true,
              activities: [
                "Memorize x = [-b +/- sqrt(b^2 - 4ac)] / (2a)",
                "Calculate discriminant D = b^2 - 4ac (2 real, 1 real, or 0 real solutions)",
                "Solve 6 quadratic equations using formula"
              ]
            }
          ]
        },
        {
          day: "Day 13 (Saturday)",
          isRevisionDay: false,
          breakTime: "15 min walk outside",
          dailyNotes: "Interleaved 3-subject challenge.",
          sessions: [
            {
              timeSlot: "10:00 AM - 10:50 AM (50 min)",
              subject: "Math & Science Weak Spot",
              topic: "Speed Drills: Algebra Factoring & Photosynthesis Pathways",
              isWeakAreaFocus: true,
              activities: [
                "25-min rapid Algebra factoring sprint (15 problems)",
                "25-min blind blank-diagram drawing of Photosynthesis thylakoid vs stroma"
              ]
            },
            {
              timeSlot: "11:05 AM - 11:55 AM (50 min)",
              subject: "History",
              topic: "History Review: Short-Answer & Source-Evaluation Practice",
              isWeakAreaFocus: false,
              activities: [
                "Complete 3 timed short-answer questions (15 mins total)",
                "Self-grade using marking rubric guidelines",
                "Refine answers to incorporate specific evidence"
              ]
            }
          ]
        },
        {
          day: "Day 14 (Sunday)",
          isRevisionDay: true,
          breakTime: "20 min relaxing break & treat",
          dailyNotes: "DEDICATED REVISION DAY 2: Mid-Point Full Diagnostic Exam.",
          sessions: [
            {
              timeSlot: "10:00 AM - 10:50 AM (50 min)",
              subject: "Mid-Point Diagnostic",
              topic: "Timed Math (Algebra) & Science (Photosynthesis) Exam Simulation",
              isWeakAreaFocus: true,
              activities: [
                "Take a 45-minute timed paper combining Algebra and Photosynthesis questions",
                "Score and compute percentage mastery",
                "Record remaining error patterns in error log"
              ]
            },
            {
              timeSlot: "11:10 AM - 12:00 PM (50 min)",
              subject: "History & Consolidation",
              topic: "Full History Master Review & Diagnostic Post-Mortem",
              isWeakAreaFocus: false,
              activities: [
                "Review all History flashcards across Weeks 1 and 2",
                "Targeted correction of any math or science concepts missed in the diagnostic",
                "Celebrate 2-week completion milestone!"
              ]
            }
          ]
        }
      ]
    },
    {
      weekNumber: 3,
      weekGoal: "Week 3: Full-Length Mocks, Final Polishing & Peak Performance",
      days: [
        {
          day: "Day 15 (Monday)",
          isRevisionDay: false,
          breakTime: "10 min stretch & drink",
          dailyNotes: "Exam-style mixed problems.",
          sessions: [
            {
              timeSlot: "5:00 PM - 5:50 PM (50 min)",
              subject: "Math",
              topic: "Mixed Algebra Exam Questions & Time-Management Tactics",
              isWeakAreaFocus: true,
              activities: [
                "Practice skipping and returning to difficult problems",
                "Double-checking techniques: plug answers back in",
                "Solve 12 exam-grade mixed algebra problems"
              ]
            },
            {
              timeSlot: "6:05 PM - 6:55 PM (50 min)",
              subject: "Science",
              topic: "Comprehensive Science Review: Photosynthesis in Context",
              isWeakAreaFocus: true,
              activities: [
                "Connect photosynthesis to energy flow, food webs, and global climate",
                "Review 5 multi-part past paper questions on plant physiology",
                "Memorize high-scoring keywords: 'photophosphorylation', 'proton gradient', 'stroma'"
              ]
            }
          ]
        },
        {
          day: "Day 16 (Tuesday)",
          isRevisionDay: false,
          breakTime: "10-15 min break",
          dailyNotes: "History mock exam questions.",
          sessions: [
            {
              timeSlot: "5:00 PM - 5:50 PM (50 min)",
              subject: "History",
              topic: "Full History Timed Section & Evidence Recall",
              isWeakAreaFocus: false,
              activities: [
                "Write 1 complete timed essay under exam conditions (40 mins)",
                "10 mins self-review: check thesis clarity, evidence richness, historical analysis"
              ]
            },
            {
              timeSlot: "6:05 PM - 6:55 PM (50 min)",
              subject: "Math",
              topic: "Algebra Error Bank Review & Tricky Edge Cases",
              isWeakAreaFocus: true,
              activities: [
                "Revisit all problems previously gotten wrong in Weeks 1 & 2",
                "Solve 5 fraction-coefficient algebraic equations",
                "Solidify zero and negative exponents rules"
              ]
            }
          ]
        },
        {
          day: "Day 17 (Wednesday)",
          isRevisionDay: false,
          breakTime: "10 min break",
          dailyNotes: "Science past paper sprint.",
          sessions: [
            {
              timeSlot: "5:00 PM - 5:50 PM (50 min)",
              subject: "Science",
              topic: "Photosynthesis Diagram Mastery & Rapid Definitions",
              isWeakAreaFocus: true,
              activities: [
                "Draw the complete light-dependent and light-independent cycles from memory",
                "Review all key terms: stomata, transpiration, chloroplast, granum, chlorophyll",
                "Answer 8 high-yield multiple-choice questions"
              ]
            },
            {
              timeSlot: "6:05 PM - 6:55 PM (50 min)",
              subject: "History",
              topic: "History Rapid Recall & Timeline Flash-Review",
              isWeakAreaFocus: false,
              activities: [
                "Cover-and-recall all 25 core dates and milestone events",
                "Review 10 key definitions and historical terminologies",
                "Synthesize major historical themes: power, conflict, economy, ideology"
              ]
            }
          ]
        },
        {
          day: "Day 18 (Thursday)",
          isRevisionDay: false,
          breakTime: "15 min refreshing break",
          dailyNotes: "Mixed 3-subject final practice.",
          sessions: [
            {
              timeSlot: "5:00 PM - 5:50 PM (50 min)",
              subject: "Math",
              topic: "Math Final Polish: Algebra Speed & Precision Test",
              isWeakAreaFocus: true,
              activities: [
                "Complete 15-problem algebra test against a 40-minute countdown",
                "10 minutes checking calculations and units"
              ]
            },
            {
              timeSlot: "6:05 PM - 6:55 PM (50 min)",
              subject: "Science & History",
              topic: "Science & History High-Yield Concept Blitz",
              isWeakAreaFocus: false,
              activities: [
                "25 mins: Review photosynthesis limiting factor graphs",
                "25 mins: Review History long-form question structure and intro paragraphs"
              ]
            }
          ]
        },
        {
          day: "Day 19 (Friday)",
          isRevisionDay: true,
          breakTime: "20 min relaxing walk",
          dailyNotes: "DEDICATED REVISION DAY 3: Complete Math Mock Exam.",
          sessions: [
            {
              timeSlot: "5:00 PM - 5:50 PM (50 min)",
              subject: "Full Mock Exam",
              topic: "Mathematics Exam Paper Simulation (Part 1)",
              isWeakAreaFocus: true,
              activities: [
                "Simulate real exam room conditions: quiet desk, strictly timed",
                "Work through Section A & Section B with emphasis on Algebra section"
              ]
            },
            {
              timeSlot: "6:10 PM - 7:00 PM (50 min)",
              subject: "Mock Grading & Review",
              topic: "Mathematics Paper Scoring & Targeted Remediation",
              isWeakAreaFocus: true,
              activities: [
                "Grade paper against rubric marking scheme",
                "Write step-by-step corrections for any calculation slip-ups",
                "Review formula sheet"
              ]
            }
          ]
        },
        {
          day: "Day 20 (Saturday)",
          isRevisionDay: true,
          breakTime: "20 min fresh air break",
          dailyNotes: "DEDICATED REVISION DAY 4: Science & History Mock Exams.",
          sessions: [
            {
              timeSlot: "10:00 AM - 10:50 AM (50 min)",
              subject: "Full Mock Exam",
              topic: "Science Mock Section (Focus on Photosynthesis & Bio-energetics)",
              isWeakAreaFocus: true,
              activities: [
                "Complete timed science past paper section",
                "Score and review answers against model answer key"
              ]
            },
            {
              timeSlot: "11:10 AM - 12:00 PM (50 min)",
              subject: "Full Mock Exam",
              topic: "History Timed Document & Essay Mock Section",
              isWeakAreaFocus: false,
              activities: [
                "Complete timed history exam questions",
                "Finalize timeline memory checkpoints"
              ]
            }
          ]
        },
        {
          day: "Day 21 (Sunday)",
          isRevisionDay: true,
          breakTime: "Generous breaks & calm evening",
          dailyNotes: "DEDICATED REVISION DAY 5: Final Confidence Check & Exam Prep.",
          sessions: [
            {
              timeSlot: "10:00 AM - 10:50 AM (50 min)",
              subject: "Final Confidence Review",
              topic: "1-Page Cheat Sheet Review (Algebra Formulas & Photosynthesis Diagrams)",
              isWeakAreaFocus: true,
              activities: [
                "Light review only: read over formula summary sheets",
                "Review photosynthesis leaf & chloroplast diagrams",
                "No heavy new problems — focus on mental confidence"
              ]
            },
            {
              timeSlot: "11:05 AM - 11:55 AM (50 min)",
              subject: "Logistics & Mindset",
              topic: "Exam Pack Preparation & Mental Readiness",
              isWeakAreaFocus: false,
              activities: [
                "Pack all exam materials: pens, pencils, ruler, eraser, calculator, water bottle",
                "Review exam timetable, room location, and arrival times",
                "Plan an early bedtime (8+ hours of sleep) for optimal cognitive recall!"
              ]
            }
          ]
        }
      ]
    }
  ]
};

export default function StudyPlanMaker({
  savedMaterials,
  customInstructions,
  onSaveItem
}: StudyPlanMakerProps) {
  const [activeWeek, setActiveWeek] = useState<number>(1);
  const [currentPlan, setCurrentPlan] = useState<PersonalizedStudyPlan>(DEFAULT_3_WEEK_PLAN);
  const [completedDays, setCompletedDays] = useState<Record<string, boolean>>({});
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Custom Generation Form State
  const [customFormOpen, setCustomFormOpen] = useState<boolean>(false);
  const [studentName, setStudentName] = useState<string>("Student");
  const [examWeeks, setExamWeeks] = useState<number>(3);
  const [subjectsInput, setSubjectsInput] = useState<string>("Math, Science, History");
  const [weakAreasInput, setWeakAreasInput] = useState<string>("Algebra (Math), Photosynthesis (Science)");
  const [hoursInput, setHoursInput] = useState<number>(2);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const toggleDayCompletion = (dayKey: string) => {
    setCompletedDays(prev => ({ ...prev, [dayKey]: !prev[dayKey] }));
  };

  const handleGenerateCustomPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/edu/generate-study-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName,
          examDurationWeeks: examWeeks,
          subjects: subjectsInput.split(",").map(s => s.trim()).filter(Boolean),
          weakAreas: weakAreasInput.split(",").map(s => s.trim()).filter(Boolean),
          hoursPerDay: hoursInput,
          customInstructions: customInstructions?.generalTone
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate study plan");

      setCurrentPlan(data);
      setActiveWeek(1);
      setCustomFormOpen(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate study plan");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    onSaveItem('exam-study-plan', currentPlan.planTitle, currentPlan);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const currentWeekData = currentPlan.weeks.find(w => w.weekNumber === activeWeek) || currentPlan.weeks[0];

  // Calculate completed progress
  const allDaysCount = currentPlan.weeks.reduce((acc, w) => acc + (w.days?.length || 0), 0);
  const completedCount = Object.values(completedDays).filter(Boolean).length;
  const progressPercent = allDaysCount > 0 ? Math.round((completedCount / allDaysCount) * 100) : 0;

  return (
    <div className="flex flex-col gap-6" id="study_plan_maker_view">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-teal-900/40 via-indigo-900/30 to-slate-900/60 border border-teal-500/30 rounded-2xl p-5 md:p-6 backdrop-blur-md shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-teal-400 font-mono text-xs uppercase tracking-wider mb-1">
            <Calendar className="w-4 h-4 text-teal-400" />
            <span>Personalized Exam Preparation Studio</span>
            <span className="bg-teal-500/20 text-teal-300 text-[10px] px-2 py-0.5 rounded-full border border-teal-500/30">3-Week Masterplan</span>
          </div>
          <h2 className="text-xl md:text-2xl font-display font-bold text-white tracking-tight">
            {currentPlan.planTitle}
          </h2>
          <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
            {currentPlan.overview}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCustomFormOpen(prev => !prev)}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-300" />
            <span>Customize Plan</span>
          </button>

          <button
            onClick={handleSave}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
              savedSuccess 
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200' 
                : 'bg-teal-600 hover:bg-teal-500 border-teal-400/40 text-white shadow-lg shadow-teal-600/20'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>{savedSuccess ? "Saved to Library!" : "Save Plan"}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs rounded-xl flex items-center justify-between shadow-lg">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-200 font-bold ml-4">✕</button>
        </div>
      )}

      {/* Custom Plan Generator Modal / Panel */}
      {customFormOpen && (
        <div className="bg-slate-900/90 border border-teal-500/40 rounded-2xl p-5 shadow-2xl space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-400" />
              <span>Generate Customized Exam Study Plan</span>
            </h3>
            <button onClick={() => setCustomFormOpen(false)} className="text-slate-400 hover:text-white">✕</button>
          </div>

          <form onSubmit={handleGenerateCustomPlan} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Student Name</label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-white/15 rounded-xl text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Preparation Window (Weeks)</label>
              <select
                value={examWeeks}
                onChange={(e) => setExamWeeks(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-800 border border-white/15 rounded-xl text-xs text-white"
              >
                <option value={2}>2 Weeks</option>
                <option value={3}>3 Weeks (Requested)</option>
                <option value={4}>4 Weeks (1 Month)</option>
                <option value={6}>6 Weeks</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Exam Subjects (comma-separated)</label>
              <input
                type="text"
                value={subjectsInput}
                onChange={(e) => setSubjectsInput(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-white/15 rounded-xl text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Weak Areas Requiring Extra Focus</label>
              <input
                type="text"
                value={weakAreasInput}
                onChange={(e) => setWeakAreasInput(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-white/15 rounded-xl text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Daily Study Hours Available</label>
              <input
                type="number"
                min={1}
                max={8}
                value={hoursInput}
                onChange={(e) => setHoursInput(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-800 border border-white/15 rounded-xl text-xs text-white"
              />
            </div>

            <div className="md:col-span-2 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCustomFormOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-teal-600/30 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Generating Tailored Plan...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Plan</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Constraints & Daily Structure Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 backdrop-blur-md flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-400 block">Daily Study Time</span>
            <span className="text-sm font-bold text-white">2 Hours / Day (120 min)</span>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 backdrop-blur-md flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-400 block">Targeted Weak Areas</span>
            <span className="text-xs font-bold text-amber-200">Algebra &amp; Photosynthesis</span>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 backdrop-blur-md flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center shrink-0">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-400 block">Structured Breaks</span>
            <span className="text-xs font-bold text-indigo-200">10-15 Min Refresh Cycles</span>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 backdrop-blur-md flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-400 block">Revision Days</span>
            <span className="text-xs font-bold text-purple-200">Days 7, 14, 19, 20 &amp; 21</span>
          </div>
        </div>
      </div>

      {/* Progress & Milestone Bar */}
      <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex-1 w-full sm:w-auto">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-slate-300">21-Day Revision Progress</span>
            <span className="font-mono font-bold text-teal-300">{completedCount} of {allDaysCount} Days Completed ({progressPercent}%)</span>
          </div>
          <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-teal-500 to-indigo-500 transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Week Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {currentPlan.weeks.map((w) => (
            <button
              key={w.weekNumber}
              onClick={() => setActiveWeek(w.weekNumber)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeWeek === w.weekNumber
                  ? 'bg-gradient-to-r from-teal-600 to-indigo-600 text-white shadow-lg shadow-teal-600/20'
                  : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <span>Week {w.weekNumber}</span>
              <span className="text-[10px] opacity-75 font-mono">({w.days?.length} Days)</span>
            </button>
          ))}
        </div>

        <div className="text-xs text-teal-300 font-semibold bg-teal-500/10 px-3 py-1 rounded-lg border border-teal-500/20">
          {currentWeekData?.weekGoal}
        </div>
      </div>

      {/* Daily Schedule Cards for Active Week */}
      <div className="space-y-4">
        {currentWeekData?.days?.map((day, dIdx) => {
          const dayKey = `w${activeWeek}-d${dIdx}`;
          const isDone = completedDays[dayKey] || false;

          return (
            <div
              key={dIdx}
              className={`rounded-2xl border transition-all p-4 md:p-5 backdrop-blur-md shadow-lg ${
                day.isRevisionDay
                  ? 'bg-gradient-to-r from-purple-950/40 to-slate-900/80 border-purple-500/30'
                  : isDone 
                    ? 'bg-emerald-950/20 border-emerald-500/30' 
                    : 'bg-white/5 border-white/10'
              }`}
            >
              {/* Day Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => toggleDayCompletion(dayKey)}
                    className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                      isDone 
                        ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20' 
                        : 'border-white/20 bg-slate-900 text-transparent hover:border-teal-400'
                    }`}
                    title="Mark Day as Completed"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                  </button>

                  <h3 className={`text-sm md:text-base font-bold ${isDone ? 'line-through text-slate-400' : 'text-white'}`}>
                    {day.day}
                  </h3>

                  {day.isRevisionDay && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold uppercase tracking-wider">
                      ★ Dedicated Revision Day
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Coffee className="w-3.5 h-3.5 text-teal-400" />
                  <span className="text-[11px] text-teal-200">{day.breakTime}</span>
                </div>
              </div>

              {/* Sessions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {day.sessions?.map((session, sIdx) => (
                  <div
                    key={sIdx}
                    className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-2.5 ${
                      session.isWeakAreaFocus
                        ? 'bg-amber-950/20 border-amber-500/30'
                        : 'bg-slate-900/60 border-white/5'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 block">{session.timeSlot}</span>
                        <h4 className="text-xs md:text-sm font-bold text-white mt-0.5">{session.topic}</h4>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {session.isWeakAreaFocus && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono font-semibold">
                            Weak Spot Priority
                          </span>
                        )}
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono">
                          {session.subject}
                        </span>
                      </div>
                    </div>

                    {/* Step by step activities */}
                    <ul className="space-y-1 text-xs text-slate-300 pl-4 list-disc">
                      {session.activities?.map((act, aIdx) => (
                        <li key={aIdx} className="leading-relaxed">{act}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* Day Notes & Break Reminder */}
              {day.dailyNotes && (
                <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                  <span>💡 <strong>Coach Note:</strong> {day.dailyNotes}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Study Tips & Milestones Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-5 backdrop-blur-md">
          <h4 className="text-xs font-bold text-teal-300 uppercase tracking-wider mb-2.5 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-teal-400" />
            <span>Weekly Milestones</span>
          </h4>
          <ul className="space-y-2 text-xs text-slate-300 pl-4 list-disc">
            {currentPlan.milestones.map((m, mIdx) => (
              <li key={mIdx} className="leading-relaxed">{m}</li>
            ))}
          </ul>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-5 backdrop-blur-md">
          <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2.5 flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-400" />
            <span>High-Retention Study Rules</span>
          </h4>
          <ul className="space-y-2 text-xs text-slate-300 pl-4 list-disc">
            {currentPlan.tips.map((t, tIdx) => (
              <li key={tIdx} className="leading-relaxed">{t}</li>
            ))}
          </ul>
        </div>
      </div>

    </div>
  );
}
