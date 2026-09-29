"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseAnswers, QUESTIONS } from "@/lib/assessment";
import { buildStatement, generateTracking, MAX_HABITS } from "@/lib/arc-engine";
import { MODULE_KEYS, parseModules } from "@/lib/modules";
import { addDays, ARC_LENGTH, isValidTimeZone, keyToDate, todayKey } from "@/lib/utils";
import { habitInputSchema } from "@/lib/validation";

export type BeginArcResult = { error: string } | undefined;

const habitsSchema = z
  .array(habitInputSchema.extend({ reason: z.string().max(300).optional() }))
  .min(1)
  .max(MAX_HABITS);
const modulesSchema = z.object(Object.fromEntries(MODULE_KEYS.map((k) => [k, z.boolean()]))).partial();

export async function beginArc(input: {
  answers: unknown;
  habits: unknown;
  modules: unknown;
  timezone: unknown;
}): Promise<BeginArcResult> {
  const user = await requireUser();

  const answers = parseAnswers(input.answers);
  if (!answers) return { error: "Some answers are missing. Go back and check them." };

  const habits = habitsSchema.safeParse(input.habits);
  if (!habits.success) return { error: `Your Arc needs between 1 and ${MAX_HABITS} rules, each with a short title.` };

  // Modules the user kept on the preview. Goals and focus type come from the answers.
  const chosen = modulesSchema.safeParse(input.modules);
  const tracking = generateTracking(answers);
  const modules = chosen.success ? parseModules(chosen.data) : tracking.modules;

  const timezone = isValidTimeZone(input.timezone) ? input.timezone : "UTC";
  const start = todayKey(timezone);

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.arc.findFirst({ where: { userId: user.id, status: "ACTIVE" }, select: { id: true } });
      if (existing) return;

      await tx.arc.create({
        data: {
          userId: user.id,
          startDate: keyToDate(start),
          endDate: keyToDate(addDays(start, ARC_LENGTH - 1)),
          status: "ACTIVE",
          statement: buildStatement(answers.futureSelf, answers.primaryGoal),
          timezone,
          modules,
          focusKind: tracking.focusKind,
          ...tracking.goals,
          answers: {
            create: QUESTIONS.map((q) => ({ questionKey: q.key, answer: answers[q.key] as Prisma.InputJsonValue })),
          },
          habits: {
            create: habits.data.map((h, i) => ({
              title: h.title,
              description: h.description || null,
              category: h.category,
              reason: h.reason || null,
              position: i,
              activeFrom: keyToDate(start),
            })),
          },
        },
      });
    });
  } catch (error) {
    // A concurrent submit hits the one-active-arc index; the Arc already exists.
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
      console.error("beginArc failed", error);
      return { error: "Something went wrong. Your Arc wasn't created. Try again." };
    }
  }

  redirect("/arc");
}
