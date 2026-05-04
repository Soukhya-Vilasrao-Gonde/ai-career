// ...existing code...
"use server";

import { db } from "@/lib/inngest/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenAI } from "@google/genai";

// The client gets the API key from the environment variable `GEMINI_API_KEY`.
const ai = new GoogleGenAI({});
const MODEL = "gemini-3-flash-preview";

export const generateAIInsights = async (industry) => {
  const prompt = `
    You are an expert industry analyst.

    Analyze the current state of the ${industry} industry and return insights in the following strict JSON format:

    {
      "salaryRanges": [
        { "role": "string", "min": number, "max": number, "median": number, "location": "string" },
        { "role": "string", "min": number, "max": number, "median": number, "location": "string" },
        { "role": "string", "min": number, "max": number, "median": number, "location": "string" },
        { "role": "string", "min": number, "max": number, "median": number, "location": "string" },
        { "role": "string", "min": number, "max": number, "median": number, "location": "string" }
      ],
      "growthRate": number,
      "demandLevel": "High" | "Medium" | "Low",
      "topSkills": ["string", "string", "string", "string", "string"],
      "marketOutlook": "Positive" | "Neutral" | "Negative",
      "keyTrends": ["string", "string", "string", "string", "string"],
      "recommendedSkills": ["string", "string", "string", "string", "string"]
    }

    Rules:
    - Return only valid JSON (no markdown or code block).
    - Use realistic values.
    - growthRate must be a non-zero percentage (e.g. 6.5).
    - Do not return empty arrays.
  `;

  const res = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
  });

  // Normalize different SDK response shapes
  let raw = "";
  if (typeof res?.text === "string" && res.text.trim()) {
    raw = res.text;
  } else if (res?.response && typeof res.response.text === "function") {
    raw = await res.response.text();
  } else if (res?.response?.candidates?.[0]?.content?.parts?.[0]?.text) {
    raw = res.response.candidates[0].content.parts[0].text;
  } else {
    raw = String(res?.response ?? "");
  }

  const cleanedText = String(raw || "")
    .replace(/```(?:json)?\n?|```/g, "")
    .trim();

  let insights;
  try {
    insights = JSON.parse(cleanedText);
  } catch (err) {
    console.error(
      "❌ Failed to parse JSON from AI for industry",
      industry,
      err,
      "raw:",
      cleanedText,
    );
    throw new Error("AI returned invalid JSON");
  }

  // Ensure growthRate is a valid positive number
  if (typeof insights.growthRate === "string") {
    insights.growthRate = parseFloat(
      insights.growthRate.replace("%", "").trim(),
    );
  }
  if (
    typeof insights.growthRate !== "number" ||
    isNaN(insights.growthRate) ||
    insights.growthRate === 0
  ) {
    console.warn("⚠️ Missing or invalid growthRate. Setting default 5.0");
    insights.growthRate = 5.0;
  }

  // Ensure arrays are not empty
  insights.salaryRanges =
    Array.isArray(insights.salaryRanges) && insights.salaryRanges.length
      ? insights.salaryRanges
      : [];
  insights.topSkills =
    Array.isArray(insights.topSkills) && insights.topSkills.length
      ? insights.topSkills
      : [];
  insights.keyTrends =
    Array.isArray(insights.keyTrends) && insights.keyTrends.length
      ? insights.keyTrends
      : [];
  insights.recommendedSkills =
    Array.isArray(insights.recommendedSkills) &&
    insights.recommendedSkills.length
      ? insights.recommendedSkills
      : [];

  return insights;
};

export async function getIndustryInsights() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");
  if (!user.industry) throw new Error("User has no industry selected");

  let industryInsight = await db.industryInsights.findUnique({
    where: { industry: user.industry },
  });

  if (!industryInsight) {
    const insights = await generateAIInsights(user.industry);
    console.log("🧠 New AI-generated insights:", insights);

    industryInsight = await db.industryInsights.create({
      data: {
        industry: user.industry,
        ...insights,
        nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  }

  return industryInsight;
}
// ...existing code...
