"use server";

import { db } from "@/lib/inngest/prisma";
import { auth } from "@clerk/nextjs/server";
import { generateAIInsights } from "./dashboard";

export async function updateuser(data) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: {
      clerkUserId: userId,
    },
  });

  if (!user) {
    throw new Error("User Not found");
  }

  try {
    const result = await db.$transaction(
      async (tx) => {
        let industryInsight = await tx.industryInsights.findUnique({
          where: {
            industry: data.industry,
          },
        });

        if (!industryInsight) {
          const aiGenerated = await generateAIInsights(data.industry);
          if (!aiGenerated) {
            throw new Error("generateAIInsights returned null or undefined");
          }
          industryInsight = await tx.industryInsights.create({
            data: {
              industry: data.industry,
              growthRate: aiGenerated.growthRate ?? 25.5, // fallback if undefined
              demandLevel: aiGenerated.demandLevel?.toUpperCase() ?? "MEDIUM", // must match enum
              nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week later
              topSkills: aiGenerated.topSkills ?? [],
              keyTrends: aiGenerated.keyTrends ?? [],
              marketOutlook:
                aiGenerated.marketOutlook?.toUpperCase() ?? "NEUTRAL", // must match enum
              recommendedSkills: aiGenerated.recommendedSkills ?? [],
              salaryRanges: aiGenerated.salaryRanges ?? [],
            },
          });
        }

        const updateduser = await tx.user.update({
          where: {
            id: user.id,
          },
          data: {
            industry: data.industry,
            experience: String(data.experience),
            bio: data.bio,
            skills: Array.isArray(data.skills)
              ? data.skills
              : data.skills?.split(",").map((skill) => skill.trim()),
          },
        });

        return { updateduser, industryInsight };
      },
      { timeout: 100000 },
    );

    if (!result || typeof result !== "object") {
      throw new Error("Transaction result is invalid");
    }

    return {
      success: true,
      updateduser: result.updateduser,
      industryInsight: result.industryInsight,
    };
  } catch (error) {
    console.log("kskskskkslvda");

    return { success: false, error: error.message };
  }
}

export async function getUserOnboardingStatus() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  try {
    const user = await db.user.findUnique({
      where: {
        clerkUserId: userId,
      },
      select: {
        industry: true,
      },
    });

    return {
      isOnboarded: Boolean(user?.industry),
    };
  } catch (error) {
    console.error("Status check error:", error);
    return {
      isOnboarded: false,
      error: error.message,
    };
  }
}
