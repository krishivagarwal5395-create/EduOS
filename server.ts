import express from "express";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

// Lazy initialization for Gemini SDK with User-Agent header
let aiClient: GoogleGenAI | null = null;
let currentKeyCached: string | undefined = undefined;

function getGeminiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  if (!aiClient || currentKeyCached !== key) {
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    currentKeyCached = key;
  }
  return aiClient;
}

// Robust Gemini execution helper with exponential backoff, jitter, and fallback models
interface GeminiCallParams {
  model?: string;
  contents: any;
  config?: any;
  fallbackModels?: string[];
  maxRetriesPerModel?: number;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function cleanErrorMessage(err: any): string {
  if (!err) return "An unexpected error occurred.";
  const msg = typeof err === "string" ? err : err.message || JSON.stringify(err);
  try {
    const jsonMatch = msg.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.error && parsed.error.message) {
        return parsed.error.message;
      }
    }
  } catch (_) {}
  return msg;
}

async function callGeminiWithRetry(params: GeminiCallParams) {
  const client = getGeminiClient();
  if (!client) {
    throw new Error("Gemini AI client is not configured. Please ensure GEMINI_API_KEY is present in Settings > Secrets.");
  }

  const primaryModel = params.model || "gemini-3.8-flash";
  const defaultFallbacks = ["gemini-3.8-flash", "gemini-flash-latest", "gemini-2.5-flash"];
  const configuredFallbacks = params.fallbackModels || defaultFallbacks;
  
  // Build unique list of models to try
  const modelsToTry: string[] = [primaryModel];
  for (const fb of configuredFallbacks) {
    if (!modelsToTry.includes(fb)) {
      modelsToTry.push(fb);
    }
  }

  const maxRetries = params.maxRetriesPerModel ?? 1;
  let lastError: any = null;

  for (const currentModel of modelsToTry) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await client.models.generateContent({
          model: currentModel,
          contents: params.contents,
          config: params.config
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const errMessage = String(err?.message || err || "");
        const errStatus = err?.status || err?.code || "";
        
        const isHighDemand =
          errStatus === 503 ||
          errStatus === "UNAVAILABLE" ||
          errMessage.includes("503") ||
          errMessage.includes("high demand") ||
          errMessage.includes("overloaded");

        const isTransient =
          isHighDemand ||
          errStatus === 429 ||
          errStatus === "RESOURCE_EXHAUSTED" ||
          errMessage.includes("try again later") ||
          errMessage.includes("RESOURCE_EXHAUSTED") ||
          errMessage.includes("quota");

        console.warn(`[Gemini API] Attempt ${attempt + 1}/${maxRetries + 1} on model '${currentModel}' failed: ${errMessage.slice(0, 150)}`);

        // If high demand 503, immediately switch to next model without wasting time on the same overloaded model
        if (isHighDemand) {
          console.warn(`[Gemini API] Model '${currentModel}' is under high demand (503). Switching to fallback model immediately.`);
          break;
        }

        if (isTransient && attempt < maxRetries) {
          const delay = (attempt + 1) * 600 + Math.floor(Math.random() * 300);
          await sleep(delay);
          continue;
        }

        // If not transient or exhausted retries on this model, switch to next fallback model
        break;
      }
    }
  }

  const formattedMsg = cleanErrorMessage(lastError);
  throw new Error(formattedMsg || "Failed to generate AI response after attempting fallback models.");
}

function parseGeminiJson<T = any>(rawText: string | undefined, fallback: T): T {
  if (!rawText) return fallback;
  try {
    const cleaned = rawText
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/, '')
      .replace(/```$/, '')
      .trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("Failed to parse JSON from model response, using fallback:", e);
    return fallback;
  }
}

function cleanBase64Data(raw: string | undefined | null): string {
  if (!raw) return "";
  const str = String(raw).trim();
  return str.includes(",") ? str.split(",")[1] : str;
}

// Global check middleware
const checkGeminiConfig = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!getGeminiClient()) {
    return res.status(503).json({
      error: "Gemini API Key is missing. Please configure GEMINI_API_KEY in the Settings > Secrets panel of the AI Studio UI to enable educational generation features."
    });
  }
  next();
};

// 1. Explain Mode Endpoint
app.post("/api/edu/explain", checkGeminiConfig, async (req, res) => {
  try {
    const { topic, style } = req.body;
    if (!topic) {
      return res.status(400).json({ error: "Topic is required" });
    }

    let styleInstruction = "";
    switch (style) {
      case "6_years_old":
        styleInstruction = "Explain like I'm 6 years old. Use very simple language, short sentences, and a very warm, encouraging tone. Avoid technical jargon or explain it with playful analogies.";
        break;
      case "grade_6":
        styleInstruction = "Explain like I'm in Grade 6 (around 11-12 years old). Use clear terms, interesting analogies, and keep it active and engaging.";
        break;
      case "high_school":
        styleInstruction = "Explain like I am a high school student. Present accurate, structured details, use standard educational terminology, and explain the core mechanisms.";
        break;
      case "analogies":
        styleInstruction = "Focus heavily on everyday, relatable analogies. Explain the concept by comparing it to something a student encounters in their daily life (like cooking, sports, games, or nature).";
        break;
      case "stories":
        styleInstruction = "Explain using an engaging, creative story. Introduce characters, a conflict, or a journey that illustrates the concept clearly.";
        break;
      default:
        styleInstruction = "Explain clearly, encouraging critical thinking, adapting to a student level. Use everyday examples.";
    }

    const prompt = `Explain the following topic: "${topic}".\n\nStyle request: ${styleInstruction}`;

    const response = await callGeminiWithRetry({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are EduOS AI, an expert educational AI assistant. Always provide accurate, curriculum-friendly, age-appropriate, and encouraging explanations. Use formatting (headings, lists) to make explanations highly readable. Avoid complex formatting that breaks simple rendering."
      }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Explain Mode Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate explanation" });
  }
});

// 2. Quiz Mode Endpoint (Structured JSON)
app.post("/api/edu/quiz", checkGeminiConfig, async (req, res) => {
  try {
    const { subject, topics, difficulty } = req.body;
    if (!subject || !topics) {
      return res.status(400).json({ error: "Subject and topics are required" });
    }

    const prompt = `Generate an interactive quiz on the subject "${subject}" specifically focusing on these topics: "${topics}". The difficulty level is "${difficulty || "Medium"}". Generate exactly 5 relevant multiple-choice questions. For each question, provide 4 options, the 0-based index of the correct answer, and a clear explanation of the solution.`;

    const response = await callGeminiWithRetry({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are EduOS AI. You construct highly accurate, curriculum-friendly quizzes for students of different levels. Return the response in strict JSON conforming to the requested schema.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["title", "questions"],
          properties: {
            title: { type: Type.STRING, description: "Title of the quiz" },
            questions: {
              type: Type.ARRAY,
              description: "List of 5 quiz questions",
              items: {
                type: Type.OBJECT,
                required: ["question", "options", "correctIndex", "explanation"],
                properties: {
                  question: { type: Type.STRING, description: "The question text" },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Exactly 4 options"
                  },
                  correctIndex: { type: Type.INTEGER, description: "The 0-based index of the correct answer (0, 1, 2, or 3)" },
                  explanation: { type: Type.STRING, description: "Detailed explanation explaining why the answer is correct and why other options are incorrect" }
                }
              }
            }
          }
        }
      }
    });

    const quizData = parseGeminiJson(response.text, { title: "Quiz", questions: [] });
    res.json(quizData);
  } catch (error: any) {
    console.error("Quiz Mode Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate quiz" });
  }
});

// 3. Flashcards Endpoint (Structured JSON)
app.post("/api/edu/flashcards", checkGeminiConfig, async (req, res) => {
  try {
    const { topic } = req.body;
    if (!topic) {
      return res.status(400).json({ error: "Topic is required" });
    }

    const prompt = `Create a list of 6 Q&A study flashcards about the topic: "${topic}". Flashcards should be concise, clear, and facilitate learning of core definitions, formulas, or concepts.`;

    const response = await callGeminiWithRetry({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are EduOS AI. Generate clear, structured study flashcards in strict JSON formatting.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["flashcards"],
          properties: {
            flashcards: {
              type: Type.ARRAY,
              description: "List of 6 flashcards",
              items: {
                type: Type.OBJECT,
                required: ["question", "answer", "hint"],
                properties: {
                  question: { type: Type.STRING, description: "The question or prompt on the front of the flashcard" },
                  answer: { type: Type.STRING, description: "The concise, clear answer on the back of the flashcard" },
                  hint: { type: Type.STRING, description: "A subtle hint to prompt the student's memory" }
                }
              }
            }
          }
        }
      }
    });

    const flashcardsData = parseGeminiJson(response.text, { flashcards: [] });
    res.json(flashcardsData);
  } catch (error: any) {
    console.error("Flashcards Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate flashcards" });
  }
});

// 4. Study Planner Endpoint (Structured JSON)
app.post("/api/edu/study-plan", checkGeminiConfig, async (req, res) => {
  try {
    const { examDate, subjects, weakAreas, hoursPerDay } = req.body;
    if (!subjects) {
      return res.status(400).json({ error: "Subjects are required" });
    }

    const prompt = `Create a customized daily study schedule. Exam is scheduled around: ${examDate || "unspecified upcoming date"}. Subjects to cover: "${subjects}". Student's weak areas: "${weakAreas || "None specified"}". Daily study time: ${hoursPerDay || 2} hours. Return a plan with a general encouraging overview, a structured 7-day milestone schedule, and strategic study/revision tips focused on overcoming weak areas.`;

    const response = await callGeminiWithRetry({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are EduOS AI. Create beautiful, structured, hyper-personalized academic study plans in JSON. Encourage positive learning patterns, breaks, and active recall.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["overview", "schedule", "tips"],
          properties: {
            overview: { type: Type.STRING, description: "General strategy overview and encouraging advice" },
            schedule: {
              type: Type.ARRAY,
              description: "A 7-day revision schedule",
              items: {
                type: Type.OBJECT,
                required: ["day", "topics", "duration", "notes"],
                properties: {
                  day: { type: Type.STRING, description: "Day of the schedule, e.g., Day 1, Day 2" },
                  topics: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Topics to focus on" },
                  duration: { type: Type.STRING, description: "Recommended study time, e.g., 90 mins" },
                  notes: { type: Type.STRING, description: "Specific study methods or active-recall suggestions for this day" }
                }
              }
            },
            tips: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "A list of 4-5 core study, wellness, and revision tips"
            }
          }
        }
      }
    });

    const planData = parseGeminiJson(response.text, { overview: "", schedule: [], tips: [] });
    res.json(planData);
  } catch (error: any) {
    console.error("Study Plan Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate study plan" });
  }
});

// 5. Lesson Planner Endpoint (Teacher Mode - Structured JSON)
app.post("/api/edu/lesson-plan", checkGeminiConfig, async (req, res) => {
  try {
    const { subject, grade, topic, duration, numClasses, sourceContent, fileBase64, fileMimeType, customInstructions } = req.body;
    if (!subject || !topic || !grade) {
      return res.status(400).json({ error: "Subject, Grade, and Topic are required" });
    }

    let prompt = `Create an original, comprehensive lesson plan for Subject: "${subject}", Grade: "${grade}", Topic: "${topic}".`;
    const numDays = parseInt(numClasses) || 1;
    if (numDays > 1) {
       prompt += `\nCreate a multi-day unit plan spanning ${numDays} days/classes. Each class is ${duration || "45 minutes"} long. Detail the learning plan for each day.`;
    } else {
       prompt += `\nThe lesson is ${duration || "45 minutes"} long. Generate realistic learning objectives, required materials, a timed step-by-step lesson outline, homework ideas, and a simple formative assessment technique.`;
    }

    if (customInstructions) {
       prompt += `\n\nTeacher's Custom Instructions to strictly follow:\n"""\n${customInstructions}\n"""`;
    }

    if (sourceContent) {
       prompt += `\n\nBase the lesson plan on the following source material:\n"""\n${sourceContent}\n"""`;
    }

    const parts: any[] = [{ text: prompt }];
    if (fileBase64 && fileMimeType) {
      const cleanData = cleanBase64Data(fileBase64);
      if (cleanData) {
        parts.push({
          inlineData: {
            data: cleanData,
            mimeType: fileMimeType
          }
        });
      }
    }

    const response = await callGeminiWithRetry({
      model: "gemini-3.8-flash",
      contents: [{ role: "user", parts }],
      config: {
        systemInstruction: "You are EduOS AI. You generate complete, innovative, structured lesson plans in JSON to help teachers save time and deliver engaging classes.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["title", "grade", "duration", "materials"],
          properties: {
            title: { type: Type.STRING, description: "Title of the lesson plan" },
            grade: { type: Type.STRING, description: "Target Grade level" },
            duration: { type: Type.STRING, description: "Duration of the lesson or total unit duration" },
            objectives: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Learning objectives (SWBAT statements)" },
            materials: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Required materials or digital resources" },
            outline: {
              type: Type.ARRAY,
              description: "Timed outline sections of the class (use this for single-day lessons)",
              items: {
                type: Type.OBJECT,
                required: ["time", "section", "activity"],
                properties: {
                  time: { type: Type.STRING, description: "Time allocation, e.g., 5 mins" },
                  section: { type: Type.STRING, description: "Section name, e.g., Warm-up, Direct Instruction, Guided Practice, Exit Ticket" },
                  activity: { type: Type.STRING, description: "Detailed description of what the teacher and students will do" }
                }
              }
            },
            homework: { type: Type.STRING, description: "Meaningful homework task that consolidates the lesson" },
            assessment: { type: Type.STRING, description: "Formative assessment or Exit Ticket query to test understanding" },
            days: {
              type: Type.ARRAY,
              description: "Use this for multi-day lesson plans to break down the outline by day",
              items: {
                type: Type.OBJECT,
                required: ["day", "topic", "objectives", "outline", "homework", "assessment"],
                properties: {
                  day: { type: Type.STRING, description: "e.g., 'Day 1'" },
                  topic: { type: Type.STRING, description: "Topic for this day" },
                  objectives: { type: Type.ARRAY, items: { type: Type.STRING } },
                  outline: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      required: ["time", "section", "activity"],
                      properties: {
                        time: { type: Type.STRING },
                        section: { type: Type.STRING },
                        activity: { type: Type.STRING }
                      }
                    }
                  },
                  homework: { type: Type.STRING },
                  assessment: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    const planData = parseGeminiJson(response.text, {});
    res.json(planData);
  } catch (error: any) {
    console.error("Lesson Plan Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate lesson plan" });
  }
});

// 6. Worksheet Generator Endpoint (Teacher Mode - Structured JSON)
app.post("/api/edu/worksheet", checkGeminiConfig, async (req, res) => {
  try {
    const { subject, grade, topic, chapterContent, customInstructions } = req.body;
    if (!subject || !topic || !grade) {
      return res.status(400).json({ error: "Subject, Grade, and Topic are required" });
    }

    let prompt = `Generate a printable student worksheet for Subject: "${subject}", Grade: "${grade}", Topic: "${topic}". Include clear instructions, exactly 5 targeted worksheet questions (can be calculations, fill-in-the-blanks, or critical thinking questions), and matching solutions.`;
    
    if (customInstructions) {
      prompt += `\n\nTeacher's Custom Instructions to strictly follow:\n"""\n${customInstructions}\n"""`;
    }

    if (chapterContent) {
      prompt += `\n\nBase the worksheet primarily on this provided chapter content:\n"""\n${chapterContent}\n"""`;
    }

    const response = await callGeminiWithRetry({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are EduOS AI. You generate outstanding, age-appropriate student worksheets with matching solution keys in JSON format.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["title", "instructions", "questions", "solutions"],
          properties: {
            title: { type: Type.STRING, description: "Worksheet Title" },
            instructions: { type: Type.STRING, description: "Student instructions on how to complete the worksheet" },
            questions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "5 questions tailored to the subject and grade"
            },
            solutions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "5 step-by-step solution keys matching the questions"
            }
          }
        }
      }
    });

    const worksheetData = parseGeminiJson(response.text, {});
    res.json(worksheetData);
  } catch (error: any) {
    console.error("Worksheet Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate worksheet" });
  }
});

// 7. Question Paper Generator Endpoint (Teacher Mode - Structured JSON)
app.post("/api/edu/question-paper", checkGeminiConfig, async (req, res) => {
  try {
    const { subject, grade, marks, difficulty, topics, duration, timings, portion, blueprint, chapterContent, customInstructions } = req.body;
    if (!subject || !topics || !grade) {
      return res.status(400).json({ error: "Subject, Grade, and Topics are required" });
    }

    let prompt = `Generate a balanced exam question paper.
Subject: "${subject}".
Grade: "${grade}".
Total Marks: ${marks || "50"}.
Duration: "${duration || "2 Hours"}".
Timings: "${timings || "Standard Exam Session"}".
Portion / Syllabus Covered: "${portion || topics}".
Difficulty: "${difficulty || "Medium"}".
Topics: "${topics}".
Blueprint details: "${blueprint || "Include MCQ and Short-answer questions"}".
Include section-wise division, exact marks per question, instructions (incorporating duration, timings, and portion details in header instructions), and a complete answer key at the end with marking criteria.`;

    if (customInstructions) {
      prompt += `\n\nTeacher's Custom Instructions to strictly follow:\n"""\n${customInstructions}\n"""`;
    }

    if (chapterContent) {
      prompt += `\n\nBase the exam primarily on this provided chapter content:\n"""\n${chapterContent}\n"""`;
    }

    const response = await callGeminiWithRetry({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are EduOS AI. Create balanced academic question papers and detailed, professional marking keys in strict JSON conforming to the requested schema. Ensure the formatting is crisp and elegant.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["paperTitle", "grade", "totalMarks", "instructions", "sections", "answerKey"],
          properties: {
            paperTitle: { type: Type.STRING, description: "Official heading/title of the exam paper" },
            grade: { type: Type.STRING },
            totalMarks: { type: Type.STRING },
            duration: { type: Type.STRING, description: "Duration of exam, e.g., 2 Hours or 90 Minutes" },
            timings: { type: Type.STRING, description: "Timings of exam, e.g., 09:00 AM - 11:00 AM" },
            portion: { type: Type.STRING, description: "Portion or Syllabus covered in this exam" },
            instructions: { type: Type.STRING, description: "General candidate instructions" },
            sections: {
              type: Type.ARRAY,
              description: "Exam sections (e.g. Section A: MCQs, Section B: Short Answers)",
              items: {
                type: Type.OBJECT,
                required: ["sectionName", "questions"],
                properties: {
                  sectionName: { type: Type.STRING, description: "E.g. Section A: Multiple Choice Questions" },
                  questions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      required: ["questionText", "marks", "type"],
                      properties: {
                        questionText: { type: Type.STRING, description: "Full question text" },
                        marks: { type: Type.STRING, description: "Marks weightage, e.g. 1 Mark, 5 Marks" },
                        type: { type: Type.STRING, description: "E.g. MCQ, Short Answer, Long Answer, HOTS" }
                      }
                    }
                  }
                }
              }
            },
            answerKey: {
              type: Type.ARRAY,
              description: "Full marking schema / complete solutions corresponding to each section and question",
              items: {
                type: Type.OBJECT,
                required: ["questionNumber", "answerText", "markingCriteria"],
                properties: {
                  questionNumber: { type: Type.STRING, description: "E.g. Section A, Question 1" },
                  answerText: { type: Type.STRING, description: "Correct answer, complete steps, or expected response" },
                  markingCriteria: { type: Type.STRING, description: "Rubric or marks distribution details" }
                }
              }
            }
          }
        }
      }
    });

    const paperData = parseGeminiJson(response.text, {});
    res.json(paperData);
  } catch (error: any) {
    console.error("Question Paper Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate question paper" });
  }
});

// 7b. Slip Test Generator Endpoint (Teacher Mode - Structured JSON)
app.post("/api/edu/slip-test", checkGeminiConfig, async (req, res) => {
  try {
    const { subject, grade, topic, duration, marks, questionTypes, chapterContent, customInstructions } = req.body;
    if (!subject || !topic || !grade) {
      return res.status(400).json({ error: "Subject, Grade, and Topic are required" });
    }

    let prompt = `Generate a quick-assessment Slip Test for Subject: "${subject}", Grade: "${grade}", Topic: "${topic}".
Duration: ${duration || "15 minutes"}. Total Marks: ${marks || "15 Marks"}.
Question distribution format request: "${questionTypes || "2 MCQs, 2 Fill-in-the-blanks, 1 Short answer question"}".
Generate concise student instructions, clear questions with mark weightage, and a matching complete answer key with marking rubric.`;

    if (customInstructions) {
      prompt += `\n\nTeacher's Custom Instructions to strictly follow:\n"""\n${customInstructions}\n"""`;
    }

    if (chapterContent) {
      prompt += `\n\nBase the slip test primarily on this provided chapter content:\n"""\n${chapterContent}\n"""`;
    }

    const response = await callGeminiWithRetry({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are EduOS AI. Generate quick, curriculum-aligned slip tests with answer keys in strict JSON conforming to the requested schema.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["title", "grade", "duration", "totalMarks", "instructions", "questions", "answerKey"],
          properties: {
            title: { type: Type.STRING, description: "Slip test heading/title" },
            grade: { type: Type.STRING },
            duration: { type: Type.STRING },
            totalMarks: { type: Type.STRING },
            instructions: { type: Type.STRING },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["questionNumber", "questionText", "marks", "type"],
                properties: {
                  questionNumber: { type: Type.STRING, description: "e.g. Q1" },
                  questionText: { type: Type.STRING },
                  marks: { type: Type.STRING, description: "e.g. 1 Mark, 2 Marks" },
                  type: { type: Type.STRING, description: "MCQ, Fill-in-the-blank, Short Answer" },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Options if MCQ"
                  }
                }
              }
            },
            answerKey: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["questionNumber", "answerText", "markingCriteria"],
                properties: {
                  questionNumber: { type: Type.STRING },
                  answerText: { type: Type.STRING },
                  markingCriteria: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    const slipTestData = parseGeminiJson(response.text, {});
    res.json(slipTestData);
  } catch (error: any) {
    console.error("Slip Test Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate slip test" });
  }
});

// 7c. Teacher AI Co-Pilot / Agentic Assistant Endpoint
app.post("/api/edu/ai-assistant", checkGeminiConfig, async (req, res) => {
  try {
    const { query, customInstructions, savedMaterials, chatHistory } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    const systemInstruction = `You are EduOS AI Co-Pilot, an agentic AI educational assistant for teachers.
Your primary capabilities:
1. PEDAGOGICAL ADVICE: Answer questions on how to teach concepts, classroom management, lesson hooks, differentiated instruction, and assessment strategies.
2. SAVED MATERIALS QUERYING & ANALYSIS: Teachers can ask you questions about their saved materials (lesson plans, worksheets, exams, scanned chapters, notebooks). You have full visibility of their saved materials library summary provided below.
3. AGENTIC TASK EXECUTOR: When requested by the teacher to create or generate resources (e.g. "Create a 15 min slip test on Electricity", "Draft a lesson plan on Photosynthesis", "Generate a worksheet on Algebra"), answer with clear instructions and provide a structured action payload so the system can run or prefill the action.

TEACHER'S CUSTOM INSTRUCTIONS PREFERENCES:
${customInstructions ? JSON.stringify(customInstructions, null, 2) : "None set."}

SAVED MATERIALS IN TEACHER'S LIBRARY:
${savedMaterials && Array.isArray(savedMaterials) && savedMaterials.length > 0 
  ? JSON.stringify(savedMaterials.map((item: any) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      date: item.date,
      summary: typeof item.data === 'string' ? item.data.slice(0, 400) : item.data?.topic || item.data?.paperTitle || item.data?.title || JSON.stringify(item.data).slice(0, 400)
    })), null, 2) 
  : "No saved materials currently in library."}

Return your response in strict JSON conforming to this schema:
{
  "text": "Detailed, professional Markdown response to the teacher",
  "action": {
    "type": "none" | "generate_slip_test" | "generate_lesson_plan" | "generate_worksheet" | "generate_question_paper" | "generate_notebook" | "generate_presentation" | "generate_youtube_script",
    "title": "Action title if applicable",
    "params": {
      "subject": "string",
      "grade": "string",
      "topic": "string",
      "duration": "string",
      "marks": "string"
    }
  }
}`;

    const contents: any[] = [];
    if (chatHistory && Array.isArray(chatHistory)) {
      chatHistory.forEach((msg: any) => {
        contents.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }]
        });
      });
    }

    contents.push({
      role: "user",
      parts: [{ text: query }]
    });

    const response = await callGeminiWithRetry({
      model: "gemini-3.8-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["text"],
          properties: {
            text: { type: Type.STRING, description: "Detailed Markdown answer" },
            action: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, description: "Action type: none, generate_slip_test, generate_lesson_plan, generate_worksheet, generate_question_paper, generate_notebook, generate_presentation, generate_youtube_script" },
                title: { type: Type.STRING },
                params: {
                  type: Type.OBJECT,
                  properties: {
                    subject: { type: Type.STRING },
                    grade: { type: Type.STRING },
                    topic: { type: Type.STRING },
                    duration: { type: Type.STRING },
                    marks: { type: Type.STRING }
                  }
                }
              }
            }
          }
        }
      }
    });

    const parsed = parseGeminiJson(response.text, { text: "No response generated.", action: { type: "none" } });
    res.json(parsed);
  } catch (error: any) {
    console.error("AI Assistant Error:", error);
    res.status(500).json({ error: error.message || "Failed to respond in AI Assistant" });
  }
});

// 8. Homework Helper Chat & Parent/Admin Guidance Endpoint (General Chat Interface)
app.post("/api/edu/advisor", checkGeminiConfig, async (req, res) => {
  try {
    const { role, query, context, chatHistory } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    let modeInstruction = "";
    if (role === "student_homework") {
      modeInstruction = `
        You are acting as the HOMEWORK HELPER.
        CRITICAL RULES:
        1. Do NOT simply provide direct answers to calculations or questions.
        2. Guide the student step-by-step by asking short, engaging guiding questions.
        3. Prompt their critical thinking. For example, if they ask 'What is 8x7?', instead of just saying '56', explain how it represents 8 groups of 7 or prompt them 'What is 8x5? Can we add 8 two more times?'.
        4. Celebrate their logical steps and efforts.
      `;
    } else if (role === "student") {
      modeInstruction = "You are EduOS AI helping a student. Explain concepts clearly, encourage active recall, use age-appropriate analogies, and never encourage cheating.";
    } else if (role === "teacher") {
      modeInstruction = "You are EduOS AI advising a teacher. Help them with classroom management ideas, curriculum outline, pedagogical advice, and grading parameters.";
    } else if (role === "parent") {
      modeInstruction = "You are EduOS AI advising a parent. Deliver learning tips, study recommendations, supportive communication techniques, positive encouragement, and never compare children negatively.";
    } else if (role === "admin") {
      modeInstruction = "You are EduOS AI advising a school administrator. Offer data-driven curriculum feedback, teacher workload balance strategies, policy drafts, and institutional safety/progress recommendations.";
    } else {
      modeInstruction = "You are EduOS AI, an encouraging school operating system assistant. Provide highly educational, friendly support.";
    }

    const contents: any[] = [];
    if (chatHistory && Array.isArray(chatHistory)) {
      chatHistory.forEach((msg: any) => {
        contents.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }]
        });
      });
    }

    // Append current context and query
    const currentPrompt = context 
      ? `Additional Context: ${context}\n\nUser Question: ${query}` 
      : query;

    contents.push({
      role: "user",
      parts: [{ text: currentPrompt }]
    });

    const response = await callGeminiWithRetry({
      model: "gemini-3.8-flash",
      contents: contents,
      config: {
        systemInstruction: `${modeInstruction}\nAlways remain highly professional, curriculum-aware, age-appropriate, positive, and motivating.`
      }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Advisor Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate AI advice" });
  }
});

// 9. Revision Mode Endpoint (Revision Materials Generator)
app.post("/api/edu/revision", checkGeminiConfig, async (req, res) => {
  try {
    const { subject, topic, grade } = req.body;
    if (!topic || !subject) {
      return res.status(400).json({ error: "Subject and Topic are required" });
    }

    const prompt = `Create study revision sheets for Subject: "${subject}", Topic: "${topic}", Grade: "${grade || "High school"}". Generate structured lists of quick summary notes, essential formulas/terms, common exam mistakes to avoid, and 3 likely exam questions with brief answer keys.`;

    const response = await callGeminiWithRetry({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are EduOS AI. You generate super clear, hyper-focused, clean revision notes in JSON to help students pass exams confidently.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["title", "quickNotes", "formulasOrTerms", "commonMistakes", "likelyQuestions"],
          properties: {
            title: { type: Type.STRING },
            quickNotes: { type: Type.ARRAY, items: { type: Type.STRING }, description: "4-5 concise summary points" },
            formulasOrTerms: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["term", "definitionOrFormula"],
                properties: {
                  term: { type: Type.STRING, description: "The word, concept or variable name" },
                  definitionOrFormula: { type: Type.STRING, description: "The equation or explanation of the term" }
                }
              }
            },
            commonMistakes: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3 typical errors students make and how to avoid them" },
            likelyQuestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["question", "answerHint"],
                properties: {
                  question: { type: Type.STRING, description: "Likely exam question" },
                  answerHint: { type: Type.STRING, description: "How to answer it correctly" }
                }
              }
            }
          }
        }
      }
    });

    const revisionData = parseGeminiJson(response.text, {});
    res.json(revisionData);
  } catch (error: any) {
    console.error("Revision Mode Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate revision sheet" });
  }
});

// 10. OCR Book Scanner & Chapter Text Extraction Endpoint
app.post("/api/edu/scan-book", checkGeminiConfig, async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: "Image data or document base64 is required" });
    }

    const cleanData = cleanBase64Data(imageBase64);
    if (!cleanData) {
      return res.status(400).json({ error: "Invalid image or document base64 data" });
    }

    const effectiveMimeType = mimeType || "image/jpeg";

    // Handle plain text files directly if uploaded
    if (effectiveMimeType.startsWith("text/")) {
      try {
        const decodedText = Buffer.from(cleanData, "base64").toString("utf-8");
        return res.json({ text: decodedText, suggestedSubject: "", suggestedChapter: "" });
      } catch (_) {}
    }

    const prompt = `You are an expert optical character recognition (OCR) and educational textbook digitizer.
Extract ALL visible text from this textbook page, document image, or file accurately and completely.

CRITICAL OCR INSTRUCTIONS:
1. Transcribe EVERY word, heading, subheading, paragraph, definition, list item, exercise question, formula, equation, table, diagram label, and sidebar note.
2. Do NOT summarize, shorten, or omit any text or sections.
3. Maintain the natural reading order for multi-column page layouts.
4. Format the extracted text in clean, professional Markdown with clear headers, bold terms, and bullet points.
5. At the very end of your response, output a JSON metadata block on a new line formatted strictly as:
\`\`\`json
{
  "suggestedSubject": "Inferred Subject Name, e.g. Science",
  "suggestedChapter": "Inferred Chapter Name, e.g. Chapter 4: Ecosystems"
}
\`\`\``;

    const response = await callGeminiWithRetry({
      model: "gemini-3.8-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: cleanData,
                mimeType: effectiveMimeType
              }
            }
          ]
        }
      ]
    });

    const rawResponse = response.text || "";
    let extractedText = rawResponse;
    let suggestedSubject = "";
    let suggestedChapter = "";

    const jsonMatch = rawResponse.match(/```json\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      try {
        const parsedMeta = JSON.parse(jsonMatch[1]);
        suggestedSubject = parsedMeta.suggestedSubject || "";
        suggestedChapter = parsedMeta.suggestedChapter || "";
        extractedText = rawResponse.replace(/```json\s*\{[\s\S]*?\}\s*```/, "").trim();
      } catch (_) {}
    }

    res.json({ text: extractedText, suggestedSubject, suggestedChapter });
  } catch (error: any) {
    console.error("Book Scanner Error:", error);
    res.status(500).json({ error: error.message || "Failed to scan book page / extract text" });
  }
});

// 11. Notebook Notes Generator Endpoint
app.post("/api/edu/notebook", checkGeminiConfig, async (req, res) => {
  try {
    const { topic, sourceContent, fileBase64, fileMimeType } = req.body;
    if (!topic) {
      return res.status(400).json({ error: "Topic is required" });
    }

    let prompt = `Generate comprehensive, structured notebook notes for the topic: "${topic}".`;
    if (sourceContent) {
      prompt += `\n\nBase the notes primarily on this provided source material:\n"""\n${sourceContent}\n"""`;
    }

    const parts: any[] = [{ text: prompt }];
    if (fileBase64 && fileMimeType) {
      const cleanData = cleanBase64Data(fileBase64);
      if (cleanData) {
        parts.push({
          inlineData: {
            data: cleanData,
            mimeType: fileMimeType
          }
        });
      }
    }

    const response = await callGeminiWithRetry({
      model: "gemini-3.8-flash",
      contents: [{ role: "user", parts }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            topic: { type: Type.STRING },
            summary: { type: Type.STRING, description: "A brief overarching summary of the topic" },
            sections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  heading: { type: Type.STRING, description: "Section heading" },
                  points: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Detailed bullet points" }
                },
                required: ["heading", "points"]
              }
            },
            keyTerms: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  term: { type: Type.STRING },
                  definition: { type: Type.STRING }
                },
                required: ["term", "definition"]
              }
            }
          },
          required: ["topic", "summary", "sections", "keyTerms"]
        }
      }
    });

    const data = parseGeminiJson(response.text, {});
    res.json(data);
  } catch (error: any) {
    console.error("Notebook Notes Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate notebook notes" });
  }
});

// Helper to search authentic educational images from Wikimedia Commons & Web
async function searchEducationalImages(query: string, limit = 8): Promise<Array<{ url: string; thumbUrl: string; title: string; source: string }>> {
  const cleanQuery = query.replace(/[^\w\s-]/gi, ' ').trim();
  const results: Array<{ url: string; thumbUrl: string; title: string; source: string }> = [];

  try {
    const wikiUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(cleanQuery)}&gsrlimit=${limit}&prop=imageinfo&iiprop=url|size|mime|thumburl&iiurlwidth=800&format=json&origin=*`;
    const wikiRes = await fetch(wikiUrl, { headers: { 'User-Agent': 'EduOS-PresentationMaker/1.0' } });
    if (wikiRes.ok) {
      const wikiData: any = await wikiRes.json();
      if (wikiData?.query?.pages) {
        Object.values(wikiData.query.pages).forEach((page: any) => {
          const info = page.imageinfo?.[0];
          if (info && info.url && (info.mime?.startsWith('image/') || info.url.match(/\.(jpg|jpeg|png|webp|svg)$/i))) {
            const rawTitle = (page.title || '').replace(/^File:/i, '').replace(/\.[^/.]+$/, '').replace(/[_]/g, ' ');
            results.push({
              url: info.url,
              thumbUrl: info.thumburl || info.url,
              title: rawTitle || cleanQuery,
              source: 'Wikimedia Commons (Verified Real Image)'
            });
          }
        });
      }
    }
  } catch (err) {
    console.warn("Wikimedia search error:", err);
  }

  // Fallback high-res curated educational photography
  if (results.length < limit) {
    const seed = Math.floor(Math.random() * 888888);
    results.push({
      url: `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanQuery + ", clean educational photography, textbook diagram, high resolution, 4k")}?width=1024&height=640&nologo=true&seed=${seed}`,
      thumbUrl: `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanQuery + ", clean educational photography, textbook diagram, high resolution, 4k")}?width=400&height=250&nologo=true&seed=${seed}`,
      title: `${cleanQuery} Visual Diagram`,
      source: 'Educational Visual Generator'
    });
  }

  return results;
}

// 12. PPT Presentation Generator Endpoint (Supports standard & Canva AI Engine)
app.post("/api/edu/presentation", checkGeminiConfig, async (req, res) => {
  try {
    const { topic, sourceContent, grade, slideCount, theme, customInstructions, useCanvaAi, canvaArchetype } = req.body;
    const finalTopic = (topic && topic.trim()) || (sourceContent ? "Selected Materials Presentation" : "Educational Presentation");
    const isCanvaAi = Boolean(useCanvaAi || canvaArchetype);

    let prompt = isCanvaAi
      ? `You are the Canva AI Presentation Designer Engine. Generate a world-class, human-designed Canva presentation deck for:
Topic / Title: "${finalTopic}"
Target Audience / Grade: "${grade || "High School / College"}"
Slide Count: ${slideCount || 7} slides
Canva AI Design Archetype: "${canvaArchetype || theme || "Canva AI Modern Gradient Pitch"}"

CANVA AI DESIGN PRINCIPLES:
1. LAYOUT VARIETY: Each slide must specify a unique Canva layoutType from: "bento-grid", "hero-split", "metrics-showcase", "process-timeline", "cards-trio", "quote-callout", "comparison-columns", "standard".
2. HARMONIOUS CANVA PALETTE: Provide a bespoke 6-color palette (hex codes for primary, secondary, background, text, accent, cardBg) that reflects the Canva design archetype.
3. CANVA ELEMENT TAGS: 2-3 design search tags for Canva stickers/illustrations (e.g. "minimalist 3d sphere", "gradient card", "neon badge").
4. VISUAL STORYTELLING: Every single slide MUST include:
   - A vivid, photorealistic "imagePrompt" (e.g. "Clean modern 3D isometric infographic of renewable solar energy cells, studio lighting, soft shadows, 4k").
   - 2-4 "imageKeywords" for stock photo search.
   - Structured "graphicType" and 3-4 "graphicElements" (with label, description, value, icon, color).
   - Crisp, punchy bullet points (3-4 max) and a bold "keyTakeaway".
5. Set speakerNotes to empty string.`
      : `Generate a structured slide-by-slide educational presentation deck.
Topic / Title: "${finalTopic}"
Requested Slide Count: ${slideCount || 7} slides
Visual Theme/Style: "${theme || "Academic Clean"}"

CRITICAL REQUIREMENT - IMAGES ON EVERY SINGLE SLIDE:
Just like presentations created by expert human designers, EVERY SINGLE SLIDE must include:
1. A vivid, high-quality "imagePrompt" describing a realistic educational photograph, scientific illustration, or 3D visual diagram that perfectly visualizes that slide's subject matter (e.g., "Photorealistic macro view of plant leaf stomata and chloroplast organelles with sunlight passing through, scientific medical textbook quality, 4k").
2. 2-4 "imageKeywords" for stock photo tagging.
3. A structured "graphicType" (flowchart | cycle | matrix | timeline | cards | metrics | hierarchy | comparison), "graphicTitle", and 3-4 structured "graphicElements".
4. Clear, concise bullet points (3-4 points max per slide) and a crisp "keyTakeaway".
5. Do NOT generate speaker notes.`;

    if (sourceContent) {
      prompt += `\n\nBase the slides directly on this selected material content:\n"""\n${sourceContent}\n"""`;
    }

    if (customInstructions) {
      prompt += `\n\nTeacher Custom Instructions:\n${customInstructions}`;
    }

    const response = await callGeminiWithRetry({
      model: "gemini-3.8-flash",
      fallbackModels: ["gemini-flash-latest", "gemini-2.5-flash"],
      contents: prompt,
      config: {
        systemInstruction: isCanvaAi
          ? "You are Canva AI Slide Designer. Output sophisticated presentation decks with Canva layout types, vibrant hex color palettes, bento grids, visual elements, and vivid image concepts in strict JSON."
          : "You are EduOS AI, an elite educational slide designer. Create highly visual, structured slide decks. Every slide must feature a vivid image prompt, realistic visual concept, clean bullet points, key takeaway, and an infographic diagram structure. Do NOT include speaker notes.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["title", "subtitle", "theme", "totalSlides", "slides"],
          properties: {
            title: { type: Type.STRING },
            subtitle: { type: Type.STRING },
            theme: { type: Type.STRING },
            totalSlides: { type: Type.NUMBER },
            canvaAiMetadata: {
              type: Type.OBJECT,
              properties: {
                designArchetype: { type: Type.STRING },
                typographyPair: { type: Type.STRING },
                dominantPalette: { type: Type.ARRAY, items: { type: Type.STRING } },
                isAiEnhanced: { type: Type.BOOLEAN }
              }
            },
            slides: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["slideNumber", "title", "bulletPoints", "visualDescription", "imagePrompt", "imageKeywords", "graphicType", "graphicTitle", "graphicElements"],
                properties: {
                  slideNumber: { type: Type.NUMBER },
                  title: { type: Type.STRING },
                  subtitle: { type: Type.STRING },
                  bulletPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                  speakerNotes: { type: Type.STRING, description: "Set to empty string" },
                  visualDescription: { type: Type.STRING, description: "Description of diagram, graphic, or visual illustration" },
                  imagePrompt: { type: Type.STRING, description: "Detailed prompt for high-definition educational photo or illustration representing this slide" },
                  imageKeywords: { type: Type.STRING, description: "2-4 search keywords for stock photos" },
                  imageUrl: { type: Type.STRING, description: "Direct image URL if available" },
                  keyTakeaway: { type: Type.STRING },
                  layoutType: { type: Type.STRING, description: "bento-grid | hero-split | metrics-showcase | process-timeline | cards-trio | quote-callout | comparison-columns | standard" },
                  canvaDesignStyle: { type: Type.STRING },
                  canvaElementTags: { type: Type.ARRAY, items: { type: Type.STRING } },
                  palette: {
                    type: Type.OBJECT,
                    properties: {
                      primary: { type: Type.STRING },
                      secondary: { type: Type.STRING },
                      background: { type: Type.STRING },
                      text: { type: Type.STRING },
                      accent: { type: Type.STRING },
                      cardBg: { type: Type.STRING }
                    }
                  },
                  graphicType: { type: Type.STRING, description: "flowchart | cycle | matrix | timeline | cards | metrics | hierarchy | comparison" },
                  graphicTitle: { type: Type.STRING, description: "Title of the visual graphic/diagram" },
                  graphicElements: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      required: ["label"],
                      properties: {
                        label: { type: Type.STRING },
                        description: { type: Type.STRING },
                        value: { type: Type.STRING },
                        icon: { type: Type.STRING },
                        color: { type: Type.STRING }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    const data: any = parseGeminiJson(response.text, {
      title: finalTopic,
      subtitle: `Educational Presentation for ${grade || "Students"}`,
      theme: theme || "Modern Indigo",
      totalSlides: slideCount || 7,
      slides: []
    });

    if (isCanvaAi) {
      data.engine = 'canva-ai';
      if (!data.canvaAiMetadata) {
        data.canvaAiMetadata = {
          designArchetype: canvaArchetype || theme || "Canva AI Modern Gradient Pitch",
          typographyPair: "Montserrat & Plus Jakarta Sans",
          dominantPalette: ["#00c4cc", "#7d2ae8", "#0e131f", "#ffffff", "#f59e0b"],
          isAiEnhanced: true
        };
      }
    }

    // Populate every single slide with authentic educational images
    if (data.slides && Array.isArray(data.slides)) {
      await Promise.all(data.slides.map(async (s: any, idx: number) => {
        const queryTerm = s.imageKeywords || `${s.title} ${finalTopic}`;
        try {
          const realImages = await searchEducationalImages(queryTerm, 3);
          if (realImages.length > 0 && realImages[0].url) {
            s.imageUrl = realImages[0].url;
            s.imageSource = realImages[0].source;
          }
        } catch (err) {
          console.warn("Real image fetch error for slide", idx, err);
        }

        // Fallback if needed
        if (!s.imageUrl) {
          const seed = Math.floor(Math.random() * 900000) + (s.slideNumber || idx + 1) * 100;
          const promptText = (s.imagePrompt || `${s.title} ${finalTopic} educational illustration`).replace(/["\n\r]/g, ' ').trim();
          s.imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptText + ", clean educational photography, high resolution, 4k, textbook style, centered composition")}?width=1024&height=640&nologo=true&seed=${seed}`;
        }
      }));
    }

    res.json(data);
  } catch (error: any) {
    console.error("Presentation Generation Error:", error);
    const isOverloaded = String(error?.message || error).includes("503") || String(error?.message || error).includes("high demand") || String(error?.message || error).includes("UNAVAILABLE");
    const friendlyError = isOverloaded 
      ? "The AI presentation service is currently experiencing high demand. Please click 'Generate Presentation' again to retry."
      : (error.message || "Failed to generate presentation");
    res.status(500).json({ error: friendlyError });
  }
});

// 12b. Search Images Endpoint (Google/Web/Wikimedia Image Finder)
app.post("/api/edu/search-images", async (req, res) => {
  try {
    const { query, limit } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    const images = await searchEducationalImages(query, limit || 12);
    const googleSearchUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`;

    res.json({
      query,
      images,
      googleSearchUrl
    });
  } catch (err: any) {
    console.error("Search images error:", err);
    res.status(500).json({ error: err.message || "Failed to search images" });
  }
});

// 12c. Regenerate Slide Image Endpoint
app.post("/api/edu/regenerate-slide-image", checkGeminiConfig, async (req, res) => {
  try {
    const { slideTitle, presentationTopic, customPrompt, style } = req.body;
    const basePrompt = customPrompt || `${slideTitle || "Education"} ${presentationTopic || "Lesson"} ${style || "photorealistic educational illustration"}`;
    
    // First try to find real educational image
    const realImages = await searchEducationalImages(basePrompt, 3);
    if (realImages.length > 0 && realImages[0].url) {
      return res.json({ imageUrl: realImages[0].url, source: realImages[0].source });
    }

    const seed = Math.floor(Math.random() * 999999);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(basePrompt + ", clean aesthetic, educational photography, high resolution, 4k, crisp")}?width=1024&height=640&nologo=true&seed=${seed}`;
    res.json({ imageUrl, source: "Generated Visual" });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to regenerate slide image" });
  }
});

// 12d. Image Proxy Endpoint for reliable PPTX image embedding
app.get("/api/edu/proxy-image", async (req, res) => {
  try {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      return res.status(400).send("url query param required");
    }
    const fetchRes = await fetch(targetUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 EduOS/1.0" }
    });
    if (!fetchRes.ok) {
      return res.status(fetchRes.status).send("Failed to load upstream image");
    }
    const contentType = fetchRes.headers.get("content-type") || "image/jpeg";
    const arrayBuf = await fetchRes.arrayBuffer();
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(Buffer.from(arrayBuf));
  } catch (err: any) {
    res.status(500).send(err.message || "Proxy image error");
  }
});

// 13. YouTube Educational Video Finder & Curator Endpoint
app.post(["/api/edu/youtube-finder", "/api/edu/youtube-script"], checkGeminiConfig, async (req, res) => {
  try {
    const { topic, sourceContent, grade, duration, customInstructions } = req.body;
    if (!topic && !sourceContent) {
      return res.status(400).json({ error: "Topic or source material content is required" });
    }

    let prompt = `Curate and find top educational YouTube videos for classroom presentation.
Topic / Title: "${topic || "Educational Video Lesson"}"
Target Grade / Audience: "${grade || "Grade 7-10 Students"}"
Preferred Video Length: "${duration || "5-10 minutes"}"`;

    if (sourceContent) {
      prompt += `\n\nBase the video recommendations directly on this selected textbook / library material:\n"""\n${sourceContent}\n"""`;
    }

    if (customInstructions) {
      prompt += `\n\nTeacher Custom Instructions:\n${customInstructions}`;
    }

    const response = await callGeminiWithRetry({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are EduOS AI, an expert educational video curator and media specialist. Find and recommend 3 to 5 top educational YouTube videos from trusted channels (e.g., CrashCourse, TED-Ed, Khan Academy, Amoeba Sisters, SciShow, Kurzgesagt, Physics Girl, National Geographic, MathAntics, MinutePhysics, SmarterEveryDay, Veritasium) to present the specified topic or textbook materials to students in class. For each video, provide the exact title, channel name, exact search query for YouTube, direct YouTube search link (https://www.youtube.com/results?search_query=...), estimated video duration, age/grade suitability, a pedagogical summary of what students will learn, why it is recommended for classroom viewing, key timestamps/chapters for guided watching, 3 thought-provoking classroom discussion questions, and a post-viewing student activity.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["title", "topic", "targetGrade", "overviewNote", "videos"],
          properties: {
            title: { type: Type.STRING },
            topic: { type: Type.STRING },
            targetGrade: { type: Type.STRING },
            overviewNote: { type: Type.STRING, description: "Teacher advice on integrating these videos in class" },
            videos: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["videoTitle", "channelName", "searchQuery", "youtubeUrl", "duration", "targetGrade", "summary", "whyRecommended", "keyTimestamps", "discussionQuestions", "recommendedActivity"],
                properties: {
                  videoTitle: { type: Type.STRING },
                  channelName: { type: Type.STRING, description: "e.g. CrashCourse, TED-Ed, Khan Academy" },
                  searchQuery: { type: Type.STRING, description: "Exact YouTube search query" },
                  youtubeUrl: { type: Type.STRING, description: "https://www.youtube.com/results?search_query=..." },
                  duration: { type: Type.STRING, description: "e.g. 5:30" },
                  targetGrade: { type: Type.STRING },
                  summary: { type: Type.STRING, description: "Summary of video content" },
                  whyRecommended: { type: Type.STRING, description: "Why this video is great for students" },
                  keyTimestamps: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      required: ["time", "topic"],
                      properties: {
                        time: { type: Type.STRING, description: "e.g. 01:20" },
                        topic: { type: Type.STRING }
                      }
                    }
                  },
                  discussionQuestions: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "3 questions to ask students after watching"
                  },
                  recommendedActivity: { type: Type.STRING, description: "Quick 5-minute post-video activity" }
                }
              }
            }
          }
        }
      }
    });

    const data = parseGeminiJson(response.text, {});
    res.json(data);
  } catch (error: any) {
    console.error("YouTube Finder Error:", error);
    res.status(500).json({ error: error.message || "Failed to find YouTube videos" });
  }
});

// =========================================================================
// 🚀 14. PPT AI PROMPT GENERATOR FOR SPECIFIC LESSONS (DIRECT DROP-IN) 🚀
// =========================================================================
app.post("/api/edu/generate-ppt-prompt", checkGeminiConfig, async (req, res) => {
  try {
    const { 
      lessonTopic, 
      subject, 
      grade, 
      slideCount = 8, 
      targetAi = "Gamma AI", 
      visualStyle = "Modern Bento & Infographic", 
      lessonObjectives, 
      keyTerminology, 
      specialInstructions, 
      sourceContent 
    } = req.body;

    if (!lessonTopic && !sourceContent) {
      return res.status(400).json({ error: "Lesson topic or source content is required" });
    }

    const effectiveTopic = lessonTopic || "Classroom Lesson";
    const effectiveSubject = subject || "General Studies";
    const effectiveGrade = grade || "Grade 8-10";

    const promptText = `Act as an elite educational curriculum designer and presentation architect.
Your mission is to generate a comprehensive, drop-in ready prompt specifically crafted for modern AI presentation generators (${targetAi}, Canva Magic Design, Tome, SlidesAI, Beautiful.ai, or ChatGPT).

LESSON DETAILS:
- Subject: ${effectiveSubject}
- Grade Level / Audience: ${effectiveGrade}
- Specific Lesson Topic: ${effectiveTopic}
- Target Number of Slides: ${slideCount}
- Target AI Presentation Tool: ${targetAi}
- Preferred Visual Aesthetic: ${visualStyle}
${lessonObjectives ? `- Core Lesson Objectives: ${lessonObjectives}` : ''}
${keyTerminology ? `- Key Terminology / Vocabulary: ${keyTerminology}` : ''}
${specialInstructions ? `- Special Teacher Instructions: ${specialInstructions}` : ''}
${sourceContent ? `- Reference Textbook / Source Material:\n"""\n${sourceContent.slice(0, 3000)}\n"""` : ''}

CRITICAL TASK:
Generate a single, masterfully formatted 'dropInPrompt' string in Markdown that a teacher can copy with one click and drop directly into ${targetAi} (or Canva Magic Design / Tome) to generate a complete, pedagogical, visually stunning slide deck.
The 'dropInPrompt' must start with:
"Create a ${slideCount}-slide presentation on '${effectiveTopic}' for ${effectiveGrade} ${effectiveSubject} students in a ${visualStyle} design aesthetic..."
And provide:
1. Palette and typography guidance
2. For EACH slide (Slide 1 to ${slideCount}):
   - Slide Title & Purpose
   - Recommended Layout (e.g. Hero Split, 3-Card Grid, Process Flow, Comparison, Visual Diagram Focus)
   - 3-4 High-retention bullet points (clear, punchy, active voice)
   - Visual Directive / AI Image prompt for graphics
   - Interactive Check-for-Understanding Question or Discussion Prompt
   - Presenter Notes (what the teacher says to explain the slide)
3. Concluding Exit Ticket / Homework Challenge.

Also provide structured JSON fields for each slide so the teacher can preview the outline in the app.`;

    const response = await callGeminiWithRetry({
      model: "gemini-3.8-flash",
      contents: promptText,
      config: {
        systemInstruction: "You are EduOS AI Prompt Architect. Output clean JSON matching the requested schema. Ensure the dropInPrompt is fully written out, extremely detailed, and ready for immediate copy-pasting into Gamma AI, Canva, or Tome without any placeholders.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["lessonTitle", "subject", "grade", "targetAi", "visualStyle", "slideCount", "dropInPrompt", "summary", "slides", "recommendedInstructions"],
          properties: {
            lessonTitle: { type: Type.STRING },
            subject: { type: Type.STRING },
            grade: { type: Type.STRING },
            targetAi: { type: Type.STRING },
            visualStyle: { type: Type.STRING },
            slideCount: { type: Type.NUMBER },
            dropInPrompt: { type: Type.STRING, description: "The full, rich, copy-paste drop-in prompt formatted in Markdown" },
            summary: { type: Type.STRING },
            recommendedInstructions: { type: Type.STRING },
            slides: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["slideNumber", "title", "layout", "bulletPoints", "visualDescription", "speakerNotes"],
                properties: {
                  slideNumber: { type: Type.NUMBER },
                  title: { type: Type.STRING },
                  layout: { type: Type.STRING },
                  bulletPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                  visualDescription: { type: Type.STRING },
                  speakerNotes: { type: Type.STRING },
                  checkQuestion: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    const data = parseGeminiJson(response.text, {
      lessonTitle: effectiveTopic,
      subject: effectiveSubject,
      grade: effectiveGrade,
      targetAi,
      visualStyle,
      slideCount,
      dropInPrompt: `Create a ${slideCount}-slide presentation on ${effectiveTopic} for ${effectiveGrade}.`,
      summary: `Lesson presentation prompt for ${effectiveTopic}`,
      recommendedInstructions: `Copy this prompt and paste it into ${targetAi} to instantly generate slides.`,
      slides: []
    });

    res.json(data);
  } catch (error: any) {
    console.error("PPT Prompt Generation Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate PPT prompt" });
  }
});

// =========================================================================
// 🏆 15. INTERACTIVE CLASSROOM TEAM QUIZ & QUESTION GENERATOR 🏆
// =========================================================================
app.post("/api/edu/generate-class-quiz", checkGeminiConfig, async (req, res) => {
  try {
    const { 
      subject = "General Science", 
      grade = "Grade 7", 
      chapterTopic, 
      numQuestions = 8, 
      difficulty = "Balanced", 
      chapterCompleted = false, 
      customInstructions, 
      sourceContent 
    } = req.body;

    if (!chapterTopic && !sourceContent) {
      return res.status(400).json({ error: "Chapter or topic is required to generate a class quiz" });
    }

    const effectiveTopic = chapterTopic || "Chapter Review";

    const prompt = `Create an exciting, interactive classroom team quiz for school students.
TOPIC & CURRICULUM:
- Subject: ${subject}
- Grade Level: ${grade}
- Chapter / Topic: "${effectiveTopic}"
- Number of Questions: ${numQuestions}
- Difficulty Level: ${difficulty}
${chapterCompleted ? `- Note: The chapter has just been marked DONE/COMPLETED by the teacher. This quiz serves as the official Chapter Completion Review Tournament.` : ''}
${sourceContent ? `- Base the questions on this textbook material:\n"""\n${sourceContent.slice(0, 3000)}\n"""` : ''}
${customInstructions ? `- Teacher's Custom Rules: ${customInstructions}` : ''}

REQUIREMENTS FOR QUESTIONS:
1. Each question must have 4 distinct, unambiguous options: ["A) ...", "B) ...", "C) ...", "D) ..."].
2. Specify 'correctOptionIndex' (0 for A, 1 for B, 2 for C, 3 for D).
3. Specify 'correctOptionLetter' ("A", "B", "C", or "D").
4. Specify 'correctAnswerText' (the exact text matching the correct option).
5. Award points per question (default 10 pts, harder questions 20 pts).
6. Provide a comprehensive 'explanation' for the teacher explaining why the option is correct and how to unpack it for children.
7. Provide a 'teacherHint' that the teacher can give out loud if the teams are stuck.
8. Provide 'commonMisconception' explaining why children might pick the wrong option.
9. Also compile a teacherAnswerKey summarizing all questions and answers.`;

    const response = await callGeminiWithRetry({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an expert game-show quiz master and master pedagogue for school classrooms. Generate high-engagement, scientifically and historically accurate questions that foster team collaboration, critical thinking, and quick thinking for children.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["quizTitle", "chapter", "subject", "grade", "chapterCompleted", "questions", "teacherAnswerKey"],
          properties: {
            quizTitle: { type: Type.STRING },
            chapter: { type: Type.STRING },
            subject: { type: Type.STRING },
            grade: { type: Type.STRING },
            chapterCompleted: { type: Type.BOOLEAN },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["id", "question", "options", "correctOptionIndex", "correctOptionLetter", "correctAnswerText", "points", "explanation", "teacherHint"],
                properties: {
                  id: { type: Type.NUMBER },
                  question: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctOptionIndex: { type: Type.NUMBER },
                  correctOptionLetter: { type: Type.STRING },
                  correctAnswerText: { type: Type.STRING },
                  points: { type: Type.NUMBER },
                  explanation: { type: Type.STRING },
                  teacherHint: { type: Type.STRING },
                  commonMisconception: { type: Type.STRING }
                }
              }
            },
            teacherAnswerKey: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["questionId", "question", "correctOption", "explanation"],
                properties: {
                  questionId: { type: Type.NUMBER },
                  question: { type: Type.STRING },
                  correctOption: { type: Type.STRING },
                  explanation: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    const data = parseGeminiJson(response.text, {
      quizTitle: `${effectiveTopic} Team Challenge`,
      chapter: effectiveTopic,
      subject,
      grade,
      chapterCompleted: !!chapterCompleted,
      questions: [],
      teacherAnswerKey: []
    });

    res.json(data);
  } catch (error: any) {
    console.error("Class Quiz Generation Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate class quiz" });
  }
});

// =========================================================================
// 📅 16. PERSONALIZED EXAM STUDY PLAN GENERATOR (3 WEEKS, REVISION & BREAKS) 📅
// =========================================================================
app.post("/api/edu/generate-study-plan", checkGeminiConfig, async (req, res) => {
  try {
    const { 
      studentName = "Student", 
      examDurationWeeks = 3, 
      subjects = ["Math", "Science", "History"], 
      weakAreas = ["Algebra (Math)", "Photosynthesis (Science)"], 
      hoursPerDay = 2, 
      customInstructions 
    } = req.body;

    const prompt = `Generate a personalized, scientifically backed study revision timetable for a student preparing for upcoming exams in ${examDurationWeeks} weeks.

STUDENT PROFILE & CONSTRAINTS:
- Student: ${studentName}
- Total Preparation Window: ${examDurationWeeks} weeks (21 days)
- Exam Subjects: ${Array.isArray(subjects) ? subjects.join(", ") : subjects}
- Identified Weak Areas requiring prioritized, heavy focus: ${Array.isArray(weakAreas) ? weakAreas.join(", ") : weakAreas}
- Available Daily Study Time: Exactly ${hoursPerDay} hours per day (120 minutes)
- Mandatory Features:
  1. High frequency of weak areas: Dedicate disproportionate time in Week 1 and Week 2 to Algebra and Photosynthesis with step-by-step conceptual mastery and deliberate practice.
  2. Structured Daily Breaks: Every day MUST follow a 50m study -> 10m break -> 50m study -> 10m review & self-test rhythm (or 25/5 Pomodoro rhythm).
  3. Dedicated Revision Days: Days 7, 14, 19, 20, and 21 MUST be dedicated consolidation & mock revision days.
  4. Balance Math, Science, and History so the student never burns out on a single subject.
${customInstructions ? `- Special Instructions: ${customInstructions}` : ''}

Generate a complete day-by-day roadmap across all 3 weeks with specific time slots, session goals, break advice, and weekly milestones.`;

    const response = await callGeminiWithRetry({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an elite academic coach and cognitive science learning specialist. Generate practical, encouraging, and highly structured study plans optimized for memory retention, active recall, and spaced repetition.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["planTitle", "overview", "dailyHours", "totalWeeks", "subjects", "weakAreas", "dailyBreakSchedule", "weeks", "milestones", "tips"],
          properties: {
            planTitle: { type: Type.STRING },
            overview: { type: Type.STRING },
            dailyHours: { type: Type.NUMBER },
            totalWeeks: { type: Type.NUMBER },
            subjects: { type: Type.ARRAY, items: { type: Type.STRING } },
            weakAreas: { type: Type.ARRAY, items: { type: Type.STRING } },
            dailyBreakSchedule: { type: Type.STRING },
            milestones: { type: Type.ARRAY, items: { type: Type.STRING } },
            tips: { type: Type.ARRAY, items: { type: Type.STRING } },
            weeks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["weekNumber", "weekGoal", "days"],
                properties: {
                  weekNumber: { type: Type.NUMBER },
                  weekGoal: { type: Type.STRING },
                  days: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      required: ["day", "isRevisionDay", "sessions", "breakTime", "dailyNotes"],
                      properties: {
                        day: { type: Type.STRING },
                        isRevisionDay: { type: Type.BOOLEAN },
                        breakTime: { type: Type.STRING },
                        dailyNotes: { type: Type.STRING },
                        sessions: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            required: ["timeSlot", "subject", "topic", "isWeakAreaFocus", "activities"],
                            properties: {
                              timeSlot: { type: Type.STRING },
                              subject: { type: Type.STRING },
                              topic: { type: Type.STRING },
                              isWeakAreaFocus: { type: Type.BOOLEAN },
                              activities: { type: Type.ARRAY, items: { type: Type.STRING } }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    const data = parseGeminiJson(response.text, {
      planTitle: "3-Week Exam Preparation Study Plan",
      overview: "Personalized revision plan for Math, Science, and History.",
      dailyHours: hoursPerDay,
      totalWeeks: examDurationWeeks,
      subjects: ["Math", "Science", "History"],
      weakAreas: ["Algebra (Math)", "Photosynthesis (Science)"],
      dailyBreakSchedule: "50m study -> 10m refresh break -> 50m study -> 10m quick review",
      weeks: [],
      milestones: [],
      tips: []
    });

    res.json(data);
  } catch (error: any) {
    console.error("Study Plan Generation Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate study plan" });
  }
});

// =========================================================================
// 🎨 CANVA CONNECT OAUTH 2.0 INTEGRATION & TOKEN EXCHANGE ENDPOINTS 🎨
// =========================================================================

// In-memory state & PKCE code_verifier store (expires after 15 minutes)
interface CanvaAuthState {
  codeVerifier: string;
  createdAt: number;
}
const canvaAuthStates = new Map<string, CanvaAuthState>();

// Active Canva token store (in-memory)
let canvaTokenStore: {
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
  expiresAt?: number;
  scope?: string;
  user?: any;
} = {};

// Clean up stale auth states periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of canvaAuthStates.entries()) {
    if (now - val.createdAt > 15 * 60 * 1000) {
      canvaAuthStates.delete(key);
    }
  }
}, 5 * 60 * 1000);

// Helper to determine the accurate redirect URI for Canva Connect OAuth
function getCanvaRedirectUri(req: express.Request): string {
  // Use APP_URL if configured, otherwise fallback to request host / forward headers
  let baseUrl = process.env.APP_URL;
  if (!baseUrl) {
    const proto = (req.headers['x-forwarded-proto'] as string) || (req.secure ? 'https' : 'https');
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
    baseUrl = `${proto}://${host}`;
  }
  // Trim trailing slash if present
  baseUrl = baseUrl.replace(/\/+$/, '');
  return `${baseUrl}/canvaOAuthCallback`;
}

// 1. Generate Canva Connect Authorization URL with PKCE
app.get("/api/canva/auth-url", (req, res) => {
  try {
    const clientId = process.env.CANVA_CLIENT_ID;
    if (!clientId) {
      return res.status(400).json({
        error: "CANVA_CLIENT_ID is not configured in environment variables. Please add CANVA_CLIENT_ID and CANVA_CLIENT_SECRET to the Settings > Secrets panel."
      });
    }

    const redirectUri = getCanvaRedirectUri(req);

    // 1. Generate a cryptographically secure random code_verifier between 43 and 128 characters
    // crypto.randomBytes(48).toString('base64url') produces a 64-character URL-safe string [A-Za-z0-9-_]
    const codeVerifier = crypto.randomBytes(48).toString('base64url');
    
    // 2. Generate the code_challenge by SHA-256 hashing the code_verifier and Base64URL-encoding the result
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    
    // 3. Cryptographically secure random state for CSRF protection
    const state = crypto.randomBytes(24).toString('base64url');

    // 4. Securely store the code_verifier and associated OAuth state for this authorization session
    canvaAuthStates.set(state, {
      codeVerifier,
      createdAt: Date.now(),
    });

    // Default Canva Connect scopes
    const scopes = [
      'design:content:read',
      'design:content:write',
      'asset:read',
      'asset:write',
      'brandtemplate:content:read',
      'brandtemplate:meta:read',
      'profile:read'
    ].join(' ');

    // 5. Build Canva authorization URL with PKCE parameters
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes,
      code_challenge: codeChallenge,
      code_challenge_method: 's256',
      state: state
    });

    const authUrl = `https://www.canva.com/api/oauth/authorize?${params.toString()}`;

    // Note: code_verifier is strictly retained on server and NOT exposed in this response
    res.json({
      authUrl,
      redirectUri,
      state
    });
  } catch (error: any) {
    console.error("Canva Auth URL Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate Canva auth URL" });
  }
});

// 2. Canva Connect OAuth Callback Endpoint (/canvaOAuthCallback)
// Handles authorization code exchange for access & refresh tokens securely
app.get([
  "/canvaOAuthCallback", 
  "/canvaOAuthCallback/", 
  "/api/canvaOAuthCallback", 
  "/api/canvaOAuthCallback/"
], async (req, res) => {
  const { code, state, error, error_description } = req.query;

  // Handle OAuth provider error response (e.g. user denied access)
  if (error) {
    const errorMsg = (error_description as string) || (error as string) || "Access was denied by the user.";
    return res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Canva Authentication Failed</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: #1e293b; padding: 2rem; border-radius: 1rem; border: 1px solid #ef4444; max-width: 440px; text-align: center; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
          h2 { color: #f87171; margin-top: 0; }
          p { color: #94a3b8; font-size: 0.9rem; line-height: 1.5; }
          button { background: #334155; color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 0.5rem; cursor: pointer; font-weight: 600; margin-top: 1rem; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>Authentication Failed</h2>
          <p>${errorMsg}</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'CANVA_OAUTH_ERROR', error: ${JSON.stringify(errorMsg)} }, '*');
              setTimeout(() => window.close(), 2500);
            }
          </script>
          <button onclick="window.close()">Close Window</button>
        </div>
      </body>
      </html>
    `);
  }

  if (!code) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <body style="font-family: sans-serif; background: #0f172a; color: #fff; padding: 2rem; text-align: center;">
        <h2>Missing Authorization Code</h2>
        <p>No authorization code was supplied in the callback parameters.</p>
        <button onclick="window.close()" style="padding: 8px 16px; border-radius: 6px; background: #4f46e5; color: #fff; border: none; cursor: pointer;">Close</button>
      </body>
      </html>
    `);
  }

  const clientId = process.env.CANVA_CLIENT_ID;
  const clientSecret = process.env.CANVA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    const errorDetail = "Server configuration missing: CANVA_CLIENT_ID or CANVA_CLIENT_SECRET environment variable is not configured.";
    console.error(`[Canva OAuth] ${errorDetail}`);
    return res.status(500).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Canva OAuth - Configuration Required</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: #1e293b; padding: 2rem; border-radius: 1rem; border: 1px solid #f59e0b; max-width: 480px; text-align: center; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
          h2 { color: #fbbf24; margin-top: 0; }
          p { color: #cbd5e1; font-size: 0.88rem; line-height: 1.5; }
          button { background: #4f46e5; color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 0.5rem; cursor: pointer; font-weight: 600; margin-top: 1rem; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>Credentials Required</h2>
          <p>CANVA_CLIENT_ID and CANVA_CLIENT_SECRET are required on the server to complete token exchange. Please add them in the Settings &gt; Secrets menu.</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'CANVA_OAUTH_ERROR',
                error: 'CANVA_CLIENT_ID or CANVA_CLIENT_SECRET is missing from server configuration.'
              }, '*');
            }
          </script>
          <button onclick="window.close()">Close Window</button>
        </div>
      </body>
      </html>
    `);
  }

  try {
    const redirectUri = getCanvaRedirectUri(req);

    // 5. Validate state and retrieve stored PKCE code_verifier
    let codeVerifier = '';
    if (state && typeof state === 'string' && canvaAuthStates.has(state)) {
      codeVerifier = canvaAuthStates.get(state)!.codeVerifier;
      canvaAuthStates.delete(state); // Prevent replay attacks
    } else {
      console.warn(`[Canva OAuth] Warning: State parameter missing or expired (${state})`);
    }

    if (!codeVerifier) {
      console.warn("[Canva OAuth] No code_verifier found for the session. Proceeding with standard authorization parameters if permissible.");
    }

    // 6. Exchange authorization code for Canva tokens using original code_verifier
    const tokenUrl = 'https://api.canva.com/rest/v1/oauth/token';
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const formBody = new URLSearchParams();
    formBody.append('grant_type', 'authorization_code');
    formBody.append('code', code as string);
    formBody.append('redirect_uri', redirectUri);
    if (codeVerifier) {
      formBody.append('code_verifier', codeVerifier);
    }

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'EduOS-CanvaConnect/1.0'
      },
      body: formBody.toString()
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("[Canva OAuth Token Exchange Failed]:", tokenData);
      const exchangeError = tokenData.error_description || tokenData.error || tokenData.message || "Failed to exchange authorization code with Canva API.";
      return res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Canva Token Exchange Error</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #1e293b; padding: 2rem; border-radius: 1rem; border: 1px solid #ef4444; max-width: 460px; text-align: center; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
            h2 { color: #f87171; margin-top: 0; }
            p { color: #94a3b8; font-size: 0.9rem; line-height: 1.5; }
            button { background: #334155; color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 0.5rem; cursor: pointer; font-weight: 600; margin-top: 1rem; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Token Exchange Error</h2>
            <p>${exchangeError}</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'CANVA_OAUTH_ERROR', error: ${JSON.stringify(exchangeError)} }, '*');
                setTimeout(() => window.close(), 3000);
              }
            </script>
            <button onclick="window.close()">Close</button>
          </div>
        </body>
        </html>
      `);
    }

    // Store tokens securely in server memory
    const expiresIn = tokenData.expires_in || 14400;
    canvaTokenStore = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      tokenType: tokenData.token_type || 'Bearer',
      expiresAt: Date.now() + (expiresIn * 1000),
      scope: tokenData.scope,
      user: tokenData.user || {}
    };

    console.log(`[Canva OAuth] Token exchange succeeded. Scope: ${tokenData.scope || 'N/A'}`);

    // Return friendly success page that notifies opener via postMessage and closes popup
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Canva Connected Successfully</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #090d16;
            color: #f8fafc;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
          }
          .card {
            background: #0f172a;
            padding: 2.5rem;
            border-radius: 1.25rem;
            border: 1px solid rgba(99, 102, 241, 0.4);
            max-width: 440px;
            text-align: center;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
          }
          .badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 52px;
            height: 52px;
            background: linear-gradient(135deg, #00c4cc 0%, #7d2ae8 100%);
            border-radius: 1rem;
            margin-bottom: 1.25rem;
            box-shadow: 0 10px 15px -3px rgba(125, 42, 232, 0.4);
          }
          .badge svg {
            width: 28px;
            height: 28px;
            fill: white;
          }
          h2 {
            color: #ffffff;
            margin: 0 0 0.5rem 0;
            font-size: 1.35rem;
            font-weight: 700;
          }
          p {
            color: #94a3b8;
            font-size: 0.9rem;
            line-height: 1.5;
            margin: 0 0 1.5rem 0;
          }
          .spinner {
            width: 24px;
            height: 24px;
            border: 3px solid rgba(255, 255, 255, 0.1);
            border-radius: 50%;
            border-top-color: #6366f1;
            animation: spin 1s ease-in-out infinite;
            margin: 0 auto 1rem auto;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          button {
            background: #6366f1;
            color: white;
            border: none;
            padding: 0.65rem 1.5rem;
            border-radius: 0.75rem;
            cursor: pointer;
            font-weight: 600;
            font-size: 0.85rem;
            transition: all 0.2s;
          }
          button:hover {
            background: #4f46e5;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">
            <svg viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <h2>Canva Connected!</h2>
          <p>Your Canva account is successfully linked to EduOS AI. You can now create and export presentations directly.</p>
          <div class="spinner"></div>
          <button onclick="window.close()">Done</button>
        </div>

        <script>
          if (window.opener) {
            window.opener.postMessage({
              type: 'CANVA_OAUTH_SUCCESS',
              payload: {
                connected: true,
                scope: ${JSON.stringify(tokenData.scope || '')},
                expiresIn: ${expiresIn}
              }
            }, '*');
            // Auto close after 1.5s
            setTimeout(() => {
              window.close();
            }, 1500);
          }
        </script>
      </body>
      </html>
    `);
  } catch (err: any) {
    console.error("[Canva OAuth Callback Exception]:", err);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <body style="font-family: sans-serif; background: #0f172a; color: #fff; padding: 2rem; text-align: center;">
        <h2>Internal Callback Error</h2>
        <p>${err.message || 'An unexpected error occurred during Canva token exchange.'}</p>
        <button onclick="window.close()" style="padding: 8px 16px; border-radius: 6px; background: #4f46e5; color: #fff; border: none; cursor: pointer;">Close</button>
      </body>
      </html>
    `);
  }
});

// 3. API endpoint to check Canva Connect Status
app.get("/api/canva/status", (req, res) => {
  const isConfigured = !!(process.env.CANVA_CLIENT_ID && process.env.CANVA_CLIENT_SECRET);
  const isConnected = !!(canvaTokenStore.accessToken && (canvaTokenStore.expiresAt || 0) > Date.now());
  const redirectUri = getCanvaRedirectUri(req);

  res.json({
    isConfigured,
    isConnected,
    scope: canvaTokenStore.scope || null,
    expiresAt: canvaTokenStore.expiresAt || null,
    redirectUri
  });
});

// 4. API endpoint to manually exchange code if requested via API
app.post("/api/canva/exchange-code", async (req, res) => {
  try {
    const { code, state, codeVerifier } = req.body;
    if (!code) {
      return res.status(400).json({ error: "Code is required" });
    }

    const clientId = process.env.CANVA_CLIENT_ID;
    const clientSecret = process.env.CANVA_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(400).json({
        error: "CANVA_CLIENT_ID or CANVA_CLIENT_SECRET is not configured on the server."
      });
    }

    const redirectUri = getCanvaRedirectUri(req);
    const tokenUrl = 'https://api.canva.com/rest/v1/oauth/token';
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const formBody = new URLSearchParams();
    formBody.append('grant_type', 'authorization_code');
    formBody.append('code', code);
    formBody.append('redirect_uri', redirectUri);
    if (codeVerifier) {
      formBody.append('code_verifier', codeVerifier);
    }

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody.toString()
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      return res.status(tokenResponse.status).json({
        error: tokenData.error_description || tokenData.error || "Token exchange failed"
      });
    }

    const expiresIn = tokenData.expires_in || 14400;
    canvaTokenStore = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      tokenType: tokenData.token_type || 'Bearer',
      expiresAt: Date.now() + (expiresIn * 1000),
      scope: tokenData.scope
    };

    res.json({
      success: true,
      connected: true,
      expiresIn: tokenData.expires_in,
      scope: tokenData.scope
    });
  } catch (error: any) {
    console.error("Canva Exchange Error:", error);
    res.status(500).json({ error: error.message || "Failed to exchange code" });
  }
});

// 5. API endpoint to disconnect Canva account
app.post("/api/canva/disconnect", (req, res) => {
  canvaTokenStore = {};
  res.json({ success: true, connected: false });
});

// 6. API endpoint to create & export presentation design to Canva Connect
app.post("/api/canva/export-design", async (req, res) => {
  try {
    const { presentation } = req.body;
    if (!presentation || !presentation.title) {
      return res.status(400).json({ error: "Presentation object with title is required" });
    }

    const isConnected = !!(canvaTokenStore.accessToken && (canvaTokenStore.expiresAt || 0) > Date.now());
    let canvaDesignUrl = `https://www.canva.com/design?create=presentation&category=presentation&topic=${encodeURIComponent(presentation.title)}`;

    if (isConnected) {
      try {
        const canvaApiRes = await fetch("https://api.canva.com/rest/v1/designs", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${canvaTokenStore.accessToken}`,
            "Content-Type": "application/json",
            "User-Agent": "EduOS-CanvaConnect/1.0"
          },
          body: JSON.stringify({
            design_type: {
              type: "preset",
              name: "presentation"
            },
            title: presentation.title.slice(0, 50)
          })
        });

        const designData = await canvaApiRes.json();
        if (canvaApiRes.ok && designData.design?.urls?.edit_url) {
          canvaDesignUrl = designData.design.urls.edit_url;
          return res.json({
            success: true,
            connected: true,
            designId: designData.design.id,
            editUrl: designData.design.urls.edit_url,
            viewUrl: designData.design.urls.view_url || designData.design.urls.edit_url,
            canvaDesignUrl
          });
        }
      } catch (canvaErr) {
        console.warn("Canva Connect API export error, falling back to direct launch URL:", canvaErr);
      }
    }

    // Direct Canva AI Presentation Studio launch URL
    res.json({
      success: true,
      connected: isConnected,
      editUrl: canvaDesignUrl,
      canvaDesignUrl
    });
  } catch (error: any) {
    console.error("Canva Export Error:", error);
    res.status(500).json({ error: error.message || "Failed to export to Canva" });
  }
});

// 6b. API endpoint to compile Canva Magic Design AI prompt
app.post("/api/canva/magic-prompt", (req, res) => {
  try {
    const { topic, grade, slideCount, theme, customInstructions } = req.body;
    const cleanTopic = topic || "Educational Presentation";
    
    const magicPrompt = `Create a ${slideCount || 7}-slide Canva presentation about "${cleanTopic}" designed for ${grade || "Students"}.
Theme & Style: ${theme || "Modern Gradient Pitch with high contrast bento layouts"}
${customInstructions ? `Special Instructions: ${customInstructions}` : ""}

Slide Guidelines:
- Visual storytelling with modern cards, charts, and clean infographics
- High-contrast colors and readable hierarchy
- Punchy key takeaways for each slide concept`;

    const canvaMagicStudioUrl = `https://www.canva.com/presentations/templates/?query=${encodeURIComponent(cleanTopic + " presentation")}`;

    res.json({
      magicPrompt,
      canvaMagicStudioUrl,
      directCreateUrl: `https://www.canva.com/design?create=presentation&category=presentation&topic=${encodeURIComponent(cleanTopic)}`
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to compile Canva Magic prompt" });
  }
});

// 7. API endpoint to remix presentation styling using Canva AI
app.post("/api/canva/remix-style", checkGeminiConfig, async (req, res) => {
  try {
    const { presentation, targetArchetype } = req.body;
    if (!presentation || !presentation.slides) {
      return res.status(400).json({ error: "Presentation is required for style remixing" });
    }

    const archetype = targetArchetype || "Canva AI Vibrant Creative Agency";
    const prompt = `You are Canva AI Design Studio. Remix the styling of this existing presentation deck to match the Canva AI Archetype: "${archetype}".
Existing Presentation Title: "${presentation.title}"
Total Slides: ${presentation.slides.length}

CURRENT SLIDES SUMMARY:
${presentation.slides.map((s: any, idx: number) => `Slide ${idx + 1}: ${s.title} (${s.bulletPoints?.slice(0, 2).join('; ')})`).join('\n')}

CANVA AI REMIX REQUIREMENTS:
1. Assign an optimal Canva layoutType for each slide from ("bento-grid", "hero-split", "metrics-showcase", "process-timeline", "cards-trio", "quote-callout", "comparison-columns", "standard").
2. Generate an authentic 6-color palette (hex for primary, secondary, background, text, accent, cardBg) matching "${archetype}".
3. Provide 2-3 Canva element search tags per slide.
4. Output Canva AI metadata.`;

    const response = await callGeminiWithRetry({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are Canva AI Design Studio. Output updated layoutTypes, color palettes, and Canva design tags in strict JSON.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["canvaAiMetadata", "remixedSlides"],
          properties: {
            canvaAiMetadata: {
              type: Type.OBJECT,
              properties: {
                designArchetype: { type: Type.STRING },
                typographyPair: { type: Type.STRING },
                dominantPalette: { type: Type.ARRAY, items: { type: Type.STRING } },
                isAiEnhanced: { type: Type.BOOLEAN }
              }
            },
            remixedSlides: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["slideNumber", "layoutType", "canvaDesignStyle", "palette"],
                properties: {
                  slideNumber: { type: Type.NUMBER },
                  layoutType: { type: Type.STRING },
                  canvaDesignStyle: { type: Type.STRING },
                  canvaElementTags: { type: Type.ARRAY, items: { type: Type.STRING } },
                  palette: {
                    type: Type.OBJECT,
                    properties: {
                      primary: { type: Type.STRING },
                      secondary: { type: Type.STRING },
                      background: { type: Type.STRING },
                      text: { type: Type.STRING },
                      accent: { type: Type.STRING },
                      cardBg: { type: Type.STRING }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    const remixData = parseGeminiJson(response.text, { canvaAiMetadata: {}, remixedSlides: [] });
    
    // Merge remixed styling into existing slides
    const updatedSlides = presentation.slides.map((s: any, idx: number) => {
      const remixed = remixData.remixedSlides?.find((rs: any) => rs.slideNumber === s.slideNumber || rs.slideNumber === idx + 1);
      return {
        ...s,
        layoutType: remixed?.layoutType || s.layoutType || "bento-grid",
        canvaDesignStyle: remixed?.canvaDesignStyle || archetype,
        palette: remixed?.palette || s.palette,
        canvaElementTags: remixed?.canvaElementTags || s.canvaElementTags
      };
    });

    res.json({
      ...presentation,
      theme: archetype,
      engine: 'canva-ai',
      canvaAiMetadata: remixData.canvaAiMetadata || {
        designArchetype: archetype,
        typographyPair: "Montserrat & Plus Jakarta Sans",
        dominantPalette: ["#00c4cc", "#7d2ae8", "#0e131f", "#ffffff"],
        isAiEnhanced: true
      },
      slides: updatedSlides
    });
  } catch (error: any) {
    console.error("Canva Remix Error:", error);
    res.status(500).json({ error: error.message || "Failed to remix Canva styling" });
  }
});

// Serve Vite or Static files depending on Environment
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
