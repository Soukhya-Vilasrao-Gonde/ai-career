"use server";

import { db } from "@/lib/inngest/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Validate API key early
if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not defined in environment variables");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Use latest stable model
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash-latest",
});

// Utility: safely extract JSON from Gemini response
function extractJSON(text) {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  } catch (err) {
    console.error("JSON parsing failed:", err);
    return null;
  }
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
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const quiz = extractJSON(text);

    if (!quiz || !quiz.questions) {
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
    userAnswer: answers[index],
    isCorrect: q.correctAnswer === answers[index],
    explanation: q.explanation,
  }));

  const wrongAnswers = questionResults.filter((q) => !q.isCorrect);

  let improvementTip = null;

  if (wrongAnswers.length > 0) {
    const wrongQuestionsText = wrongAnswers
      .map(
        (q) =>
          `Question: "${q.question}"\nCorrect: "${q.answer}"\nUser: "${q.userAnswer}"`
      )
      .join("\n\n");

    const improvementPrompt = `
The user got these ${user.industry} questions wrong:

${wrongQuestionsText}

Give 1–2 short, practical improvement tips.
Be encouraging and focus on what to study next.
`;

    try {
      const tipResult = await model.generateContent(improvementPrompt);
      improvementTip = tipResult.response.text().trim();
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
