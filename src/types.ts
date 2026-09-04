export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Quiz {
  title: string;
  questions: QuizQuestion[];
}

export interface Flashcard {
  question: string;
  answer: string;
  hint: string;
}

export interface FlashcardCollection {
  flashcards: Flashcard[];
}

export interface StudyDay {
  day: string;
  topics: string[];
  duration: string;
  notes: string;
}

export interface StudyPlan {
  overview: string;
  schedule: StudyDay[];
  tips: string[];
}

export interface LessonOutline {
  time: string;
  section: string;
  activity: string;
}

export interface LessonPlan {
  title: string;
  grade: string;
  duration: string;
  objectives?: string[];
  materials: string[];
  outline?: LessonOutline[];
  homework?: string;
  assessment?: string;
  days?: {
    day: string;
    topic: string;
    objectives: string[];
    outline: LessonOutline[];
    homework: string;
    assessment: string;
  }[];
}

export interface Worksheet {
  title: string;
  instructions: string;
  questions: string[];
  solutions: string[];
}

export interface PaperQuestion {
  questionText: string;
  marks: string;
  type: string;
  options?: string[];
}

export interface PaperSection {
  sectionName: string;
  questions: PaperQuestion[];
}

export interface AnswerKeyItem {
  questionNumber: string;
  answerText: string;
  markingCriteria: string;
}

export interface QuestionPaper {
  paperTitle: string;
  grade: string;
  totalMarks: string;
  duration?: string;
  timings?: string;
  portion?: string;
  instructions: string;
  sections: PaperSection[];
  answerKey: AnswerKeyItem[];
}

export interface SlipTestQuestion {
  questionNumber: string;
  questionText: string;
  marks: string;
  type: string;
  options?: string[];
}

export interface SlipTestAnswerKeyItem {
  questionNumber: string;
  answerText: string;
  markingCriteria: string;
}

export interface SlipTest {
  title: string;
  grade: string;
  duration: string;
  totalMarks: string;
  instructions: string;
  questions: SlipTestQuestion[];
  answerKey: SlipTestAnswerKeyItem[];
}

export interface CustomInstructions {
  lessonPlan?: string;
  worksheet?: string;
  exam?: string;
  slipTest?: string;
  presentation?: string;
  youtubeScript?: string;
  generalTone?: string;
}

export interface SlideGraphicElement {
  label: string;
  description?: string;
  value?: string;
  color?: string;
  icon?: string;
}

export interface SlidePalette {
  primary: string;
  secondary: string;
  background: string;
  text: string;
  accent: string;
  cardBg: string;
}

export interface Slide {
  slideNumber: number;
  title: string;
  subtitle?: string;
  bulletPoints: string[];
  speakerNotes?: string;
  visualDescription: string;
  keyTakeaway?: string;
  imageUrl?: string;
  imageSource?: string;
  imagePrompt?: string;
  imageKeywords?: string;
  graphicType?: 'flowchart' | 'cycle' | 'matrix' | 'timeline' | 'cards' | 'metrics' | 'hierarchy' | 'comparison' | string;
  graphicTitle?: string;
  graphicElements?: SlideGraphicElement[];
  // Canva AI Extended Properties
  layoutType?: 'bento-grid' | 'hero-split' | 'metrics-showcase' | 'process-timeline' | 'cards-trio' | 'quote-callout' | 'comparison-columns' | 'standard' | string;
  canvaDesignStyle?: string;
  palette?: SlidePalette;
  canvaElementTags?: string[];
}

export interface CanvaAiMetadata {
  designArchetype: string;
  typographyPair: string;
  dominantPalette: string[];
  canvaExportUrl?: string;
  templateId?: string;
  isAiEnhanced?: boolean;
}

export interface Presentation {
  title: string;
  subtitle: string;
  targetAudience?: string;
  theme: string;
  totalSlides: number;
  slides: Slide[];
  engine?: 'standard' | 'canva-ai';
  canvaAiMetadata?: CanvaAiMetadata;
}

export interface VideoTimestamp {
  time: string;
  topic: string;
}

export interface CuratedYouTubeVideo {
  videoTitle: string;
  channelName: string;
  searchQuery: string;
  youtubeUrl: string;
  duration: string;
  targetGrade: string;
  summary: string;
  whyRecommended: string;
  keyTimestamps: VideoTimestamp[];
  discussionQuestions: string[];
  recommendedActivity: string;
}

export interface YouTubeRecommendationResult {
  title: string;
  topic: string;
  targetGrade: string;
  overviewNote: string;
  videos: CuratedYouTubeVideo[];
}

export interface FormulaTerm {
  term: string;
  definitionOrFormula: string;
}

export interface LikelyQuestion {
  question: string;
  answerHint: string;
}

export interface RevisionMaterial {
  title: string;
  quickNotes: string[];
  formulasOrTerms: FormulaTerm[];
  commonMistakes: string[];
  likelyQuestions: LikelyQuestion[];
}

export interface ScannedChapter {
  subject: string;
  chapterName: string;
  content: string;
  originalFile?: {
    data: string;
    mimeType: string;
  };
}

export interface NotebookSection {
  heading: string;
  points: string[];
}

export interface NotebookNotes {
  topic: string;
  summary: string;
  sections: NotebookSection[];
  keyTerms: { term: string; definition: string }[];
}

export interface SavedItem {
  id: string;
  type: 'quiz' | 'study-plan' | 'lesson-plan' | 'worksheet' | 'question-paper' | 'revision' | 'scanned-chapter' | 'chapter' | 'notebook' | 'slip-test' | 'presentation' | 'youtube-script' | 'youtube-recommendation' | 'ppt-prompt' | 'class-quiz' | 'exam-study-plan';
  title: string;
  date: string;
  data: any;
}

export interface PPTPromptSlide {
  slideNumber: number;
  title: string;
  layout: string;
  bulletPoints: string[];
  visualDescription: string;
  speakerNotes: string;
  checkQuestion?: string;
}

export interface PPTPromptResult {
  lessonTitle: string;
  subject: string;
  grade: string;
  targetAi: string;
  visualStyle: string;
  slideCount: number;
  dropInPrompt: string;
  summary: string;
  slides: PPTPromptSlide[];
  recommendedInstructions: string;
}

export interface QuizQuestionItem {
  id: number | string;
  question: string;
  options: string[];
  correctOptionIndex: number;
  correctOptionLetter: string;
  correctAnswerText: string;
  points: number;
  explanation: string;
  teacherHint: string;
  commonMisconception?: string;
}

export interface ClassroomTeam {
  id: string;
  name: string;
  captainName: string;
  color: string;
  score: number;
  members: string[];
}

export interface ClassroomQuiz {
  quizTitle: string;
  chapter: string;
  subject: string;
  grade: string;
  chapterCompleted: boolean;
  questions: QuizQuestionItem[];
  teacherAnswerKey: {
    questionId: number;
    question: string;
    correctOption: string;
    explanation: string;
  }[];
}

export interface StudyPlanSession {
  timeSlot: string;
  subject: string;
  topic: string;
  isWeakAreaFocus: boolean;
  activities: string[];
}

export interface StudyPlanDay {
  day: string;
  dateLabel?: string;
  isRevisionDay: boolean;
  sessions: StudyPlanSession[];
  breakTime: string;
  dailyNotes: string;
  completed?: boolean;
}

export interface StudyPlanWeek {
  weekNumber: number;
  weekGoal: string;
  days: StudyPlanDay[];
}

export interface PersonalizedStudyPlan {
  planTitle: string;
  overview: string;
  dailyHours: number;
  totalWeeks: number;
  subjects: string[];
  weakAreas: string[];
  dailyBreakSchedule: string;
  weeks: StudyPlanWeek[];
  milestones: string[];
  tips: string[];
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role?: 'teacher' | 'admin' | 'student';
}

export type CloudSyncState = 'synced' | 'syncing' | 'offline' | 'error' | 'local_only';

