// ...existing code...
"use server";

import { db } from "@/lib/inngest/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenAI } from "@google/genai";

// Use fixed model only (no process.env)
const ai = new GoogleGenAI({});
const MODEL = "gemini-3-flash-preview";

// Utility: safely extract JSON from Gemini response
function extractJSON(text) {
  try {
    const trimmed = String(text || "").trim();
    if (!trimmed) return null;
    // Try direct parse first (AI may return only JSON)
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      return JSON.parse(trimmed);
    }
    // Fallback: find first JSON object/array in text
    const objMatch = trimmed.match(/\{[\s\S]*\}/);
    const arrMatch = trimmed.match(/\[[\s\S]*\]/);
    const match = objMatch || arrMatch;
    if (!match) return null;
    return JSON.parse(match[0]);
  } catch (err) {
    console.error("JSON parsing failed:", err);
    return null;
  }
}

// Normalize different SDK response shapes to a text string
async function extractTextFromResponse(res) {
  if (!res) return "";
  if (typeof res?.text === "string" && res.text.trim()) return res.text;
  if (res?.response && typeof res.response.text === "function") {
    return String(await res.response.text());
  }
  if (res?.response?.candidates?.[0]?.content?.parts?.[0]?.text) {
    return String(res.response.candidates[0].content.parts[0].text);
  }
  return String(res?.response ?? "");
}

// ------------------- GENERATE QUIZ -------------------
export async function generateQuiz() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    select: {
      industry: true,
      skills: true,
    },
  });

  if (!user) throw new Error("User not found");

  const prompt = `
Generate 10 technical interview questions for a ${user.industry} professional${
    user.skills?.length ? ` with expertise in ${user.skills.join(", ")}` : ""
  }.

Each question must:
- Be multiple choice
- Have exactly 4 options
- Include correct answer + explanation

STRICTLY return ONLY valid JSON in this format:
{
  "questions": [
    {
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "correctAnswer": "string",
      "explanation": "string"
    }
  ]
}
`;

  try {
    const res = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
    });

    const text = await extractTextFromResponse(res);
    const quiz = extractJSON(text);

    if (!quiz || !Array.isArray(quiz.questions)) {
      console.error("Invalid Gemini response:", text);
      throw new Error("Invalid quiz format from AI");
    }

    return quiz.questions;
  } catch (error) {
    console.error("Error generating quiz:", error);
    throw new Error("Failed to generate quiz questions");
  }
}

// ------------------- SAVE RESULT -------------------
export async function saveQuizResult(questions, answers, score) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  const questionResults = questions.map((q, index) => ({
    question: q.question,
    answer: q.correctAnswer,
    userAnswer: answers[index] ?? null,
    isCorrect: q.correctAnswer === answers[index],
    explanation: q.explanation,
  }));

  const wrongAnswers = questionResults.filter((q) => !q.isCorrect);

  let improvementTip = null;

  if (wrongAnswers.length > 0) {
    const wrongQuestionsText = wrongAnswers
      .map(
        (q) =>
          `Question: "${q.question}"\nCorrect: "${q.answer}"\nUser: "${q.userAnswer}"`,
      )
      .join("\n\n");

    const improvementPrompt = `
The user got these ${user.industry} questions wrong:

${wrongQuestionsText}

Give 1–2 short, practical improvement tips.
Be encouraging and focus on what to study next.
`;

    try {
      const tipRes = await ai.models.generateContent({
        model: MODEL,
        contents: improvementPrompt,
      });
      const tipText = await extractTextFromResponse(tipRes);
      improvementTip = String(tipText || "").trim();
    } catch (error) {
      console.error("Tip generation failed:", error);
      // don't break flow
    }
  }

  try {
    const assessment = await db.assessments.create({
      data: {
        userId: user.id,
        quizScore: score,
        questions: questionResults,
        category: "Technical",
        improvementTip,
      },
    });

    return assessment;
  } catch (error) {
    console.error("DB save failed:", error);
    throw new Error("Failed to save quiz result");
  }
}

// ------------------- GET ASSESSMENTS -------------------
export async function getAssessments() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  try {
    return await db.assessments.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  } catch (error) {
    console.error("Fetch assessments failed:", error);
    throw new Error("Failed to fetch assessments");
  }
}
// ...existing code...
