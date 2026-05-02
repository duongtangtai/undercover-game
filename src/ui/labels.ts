import type { Role, WinnerTeam } from "../game/types";

export const ROLE_LABELS: Record<Role, string> = {
  civilian: "Dân thường",
  spy: "Gián điệp",
  white: "Mũ trắng",
};

export const WINNER_LABELS: Record<WinnerTeam, string> = {
  civilian: "Dân thường thắng",
  spy: "Gián điệp thắng",
  white: "Mũ trắng thắng",
};

export function roleClass(role: Role): string {
  return `role-${role}`;
}
