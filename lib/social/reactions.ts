/** Three reactions, nothing more. Safe on client and server. */
export const REACTIONS = ["CLAP", "FIRE", "STRONG"] as const;
export type Reaction = (typeof REACTIONS)[number];
export const REACTION_EMOJI: Record<Reaction, string> = { CLAP: "👏", FIRE: "🔥", STRONG: "💪" };
export const REACTION_LABEL: Record<Reaction, string> = { CLAP: "Applause", FIRE: "Fire", STRONG: "Strong" };
