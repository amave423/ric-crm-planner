import type { User } from "../../types/user";

export const fullName = (user: User) => `${user.surname || ""} ${user.name || ""}`.trim();

export function roleFlags(roleRaw?: string) {
  const role = String(roleRaw || "").toLowerCase();
  return {
    isOrganizer: role === "organizer" || role.includes("admin"),
    isCurator: role.includes("curator"),
    isStudent: role === "student" || role.includes("project"),
  };
}

export function isFallbackParticipantName(value: string) {
  return /^Участник #\d+$/.test(value);
}
