// ...existing code...
import { db } from "@/lib/inngest/prisma";
import { inngest } from "./client";
import { GoogleGenAI } from "@google/genai";

// Use fixed model only (no process.env)
const ai = new GoogleGenAI({});
const MODEL = "gemini-3-flash-preview";

export const generateIndustryInsights = inngest.createFunction(
  { name: "Generate Industry Insights" },
  { cron: "0 0 * * 0" },
  async ({ event, step }) => {
    const industries = await step.run("Fetch industries", async () => {
      return await db.industryInsight.findMany({
        select: { industry: true },
      });
    });

    for (const { industry } of industries) {
      const prompt = `
          Analyze the current state of the ${industry} industry and provide insights in ONLY the following JSON format without any additional notes or explanations:
          {
            "salaryRanges": [
              { "role": "string", "min": number, "max": number, "median": number, "location": "string" }
            ],
            "growthRate": number,
            "demandLevel": "High" | "Medium" | "Low",
            "topSkills": ["skill1", "skill2"],
            "marketOutlook": "Positive" | "Neutral" | "Negative",
            "keyTrends": ["trend1", "trend2"],
            "recommendedSkills": ["skill1", "skill2"]
          }
          
          IMPORTANT: Return ONLY the JSON. No additional text, notes, or markdown formatting.
          Include at least 5 common roles for salary ranges.
          Growth rate should be a percentage.
          Include at least 5 skills and trends.
        `;

      try {
        // Use GoogleGenAI client like your example
        const res = await ai.models.generateContent({
          model: MODEL,
          contents: prompt,
        });

        // Support multiple response shapes from different SDK versions
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
            `Failed to parse insights JSON for ${industry}:`,
            err,
            "raw:",
            cleanedText,
          );
          continue; // skip this industry and proceed
        }

        await step.run(`Update ${industry} insights`, async () => {
          await db.industryInsight.update({
            where: { industry },
            data: {
              ...insights,
              lastUpdated: new Date(),
              nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
          });
        });
      } catch (err) {
        console.error(`AI generation failed for ${industry}:`, err);
        // continue to next industry without throwing to keep cron resilient
        continue;
      }
    }
  },
);
// ...existing code...
