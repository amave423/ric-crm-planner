import type { User } from "../../types/user";
import type { GanttTick } from "./planner.types";

export function buildGanttTicks(minDate: string, maxDate: string, span: number): GanttTick[] {
  if (!minDate || !maxDate) return [];
  const start = new Date(minDate);
  const end = new Date(maxDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
  const days = Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86400000));
  const step = days > 90 ? 14 : days > 45 ? 7 : days > 21 ? 3 : 1;
  const ticks: GanttTick[] = [];
  for (let d = 0; d <= days; d += step) {
    const date = new Date(start.getTime() + d * 86400000);
    const label = date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
    ticks.push({ offset: (d / span) * 100, label });
  }
  return ticks;
}

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
