/**
 * Who may see what. Pure functions, enforced on the server by every query
 * that returns another user's data. Health data never appears here: it is
 * not part of any social surface.
 */

export type VisibilityValue = "PUBLIC" | "FRIENDS" | "PRIVATE";
export type LeaderboardVisibilityValue = "SHOW" | "ANONYMOUS" | "HIDDEN";

export type Relationship = "self" | "friend" | "other" | "anonymous";

export function relationship(ownerId: string, viewerId: string | null, isFriend: boolean): Relationship {
  if (!viewerId) return "anonymous";
  if (viewerId === ownerId) return "self";
  return isFriend ? "friend" : "other";
}

/** Visibility rule shared by posts and profiles. */
export function canView(visibility: VisibilityValue, rel: Relationship): boolean {
  if (rel === "self") return true;
  if (visibility === "PUBLIC") return true;
  if (visibility === "FRIENDS") return rel === "friend";
  return false;
}

export type ProfilePrivacy = {
  profileVisibility: VisibilityValue;
  showXp: boolean;
  showStreak: boolean;
  showBadges: boolean;
  showArcDay: boolean;
};

export type ProfileStats = {
  xp: number;
  level: number;
  streak: number;
  arcDay: number | null;
  arcLength: number | null;
};

/** The stats a viewer may see. Hidden fields are null, never zero. */
export function visibleStats(privacy: ProfilePrivacy, stats: ProfileStats, rel: Relationship) {
  const all = rel === "self";
  return {
    xp: all || privacy.showXp ? stats.xp : null,
    level: all || privacy.showXp ? stats.level : null,
    streak: all || privacy.showStreak ? stats.streak : null,
    arcDay: all || privacy.showArcDay ? stats.arcDay : null,
    arcLength: all || privacy.showArcDay ? stats.arcLength : null,
    showBadges: all || privacy.showBadges,
  };
}

export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

const RESERVED = new Set([
  "admin", "arc", "api", "me", "settings", "login", "logout", "social", "friends", "leaderboard",
  "badges", "profile", "milestone", "support", "help", "root", "system", "null", "undefined",
]);

export function isValidUsername(value: string): boolean {
  return USERNAME_PATTERN.test(value) && !RESERVED.has(value);
}

/** A starting username from a display name or email. May still collide; callers add a suffix. */
export function usernameBase(name: string | null, email: string | null): string {
  const source = name || email?.split("@")[0] || "arc";
  const slug = source
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 16);
  const base = slug.length >= 3 ? slug : `${slug}arc`.padEnd(3, "0");
  return RESERVED.has(base) ? `${base}_1` : base;
}
