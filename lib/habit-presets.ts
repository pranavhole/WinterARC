/** Ready-made daily habits offered when adding a rule. Plain data, client-safe. */

import type { HabitCategoryValue } from "@/lib/arc-engine";

export type HabitPreset = { title: string; description: string; category: HabitCategoryValue };

export const HABIT_PRESET_GROUPS: { label: string; presets: HabitPreset[] }[] = [
  {
    label: "Body",
    presets: [
      { title: "Drink 3–4 L water", description: "Keep a bottle nearby and finish it twice.", category: "HEALTH" },
      { title: "Hit your protein goal", description: "Around 1.6 g per kg of body weight.", category: "HEALTH" },
      { title: "10 min stretching", description: "Mobility for hips, back and shoulders.", category: "FITNESS" },
      { title: "Walk 30 minutes", description: "Outside if you can.", category: "FITNESS" },
      { title: "Workout", description: "Train as planned. Any intentional session counts.", category: "FITNESS" },
      { title: "Cold shower", description: "Finish with at least 30 seconds of cold water.", category: "HEALTH" },
      { title: "No junk food or sugar", description: "Skip the processed snacks and sugary drinks.", category: "LIFESTYLE" },
    ],
  },
  {
    label: "Mind",
    presets: [
      { title: "Meditate 10 minutes", description: "Sit still and follow your breath.", category: "MENTAL" },
      { title: "Journal", description: "A few honest lines about the day.", category: "MENTAL" },
      { title: "Read 10 pages", description: "Or 20 minutes of learning something that matters to you.", category: "LEARNING" },
      { title: "Learn something new", description: "20 minutes on a skill you're building.", category: "LEARNING" },
    ],
  },
  {
    label: "Focus & work",
    presets: [
      { title: "Deep work block", description: "One task, no distractions, phone in another room.", category: "FOCUS" },
      { title: "Solve 2 DSA problems", description: "Write down the pattern for each one.", category: "CAREER" },
      { title: "Plan tomorrow", description: "Write the one thing that matters most tomorrow.", category: "DISCIPLINE" },
      { title: "Night review", description: "What went well, what to fix tomorrow.", category: "DISCIPLINE" },
    ],
  },
  {
    label: "Routine & digital",
    presets: [
      { title: "Morning sunlight 10 min", description: "Get outside within an hour of waking.", category: "LIFESTYLE" },
      { title: "No phone first 30 minutes", description: "Start the day before the feed does.", category: "DIGITAL" },
      { title: "No screens after 11 pm", description: "Wind down without a screen.", category: "DIGITAL" },
      { title: "In bed on time", description: "Be in bed at your planned time.", category: "SLEEP" },
    ],
  },
];

export const HABIT_PRESETS: HabitPreset[] = HABIT_PRESET_GROUPS.flatMap((g) => g.presets);
