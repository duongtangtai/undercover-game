import type { Role } from "../game/types";

export function roleIcon(role: Role): string {
  const icons: Record<Role, string> = {
    civilian: `
      <svg class="role-icon" viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="17" r="8"></circle>
        <path d="M10 40c2.6-8.4 8-12.6 14-12.6S35.4 31.6 38 40"></path>
      </svg>
    `,
    spy: `
      <svg class="role-icon" viewBox="0 0 48 48" aria-hidden="true">
        <path d="M13 18h22l-3-7H16l-3 7Z"></path>
        <path d="M10 22c5.8-1.5 9.8-1.5 14 0 4.2-1.5 8.2-1.5 14 0"></path>
        <circle cx="18" cy="27" r="4"></circle>
        <circle cx="30" cy="27" r="4"></circle>
        <path d="M22 27h4"></path>
        <path d="M17 37c4.5 2.2 9.5 2.2 14 0"></path>
      </svg>
    `,
    white: `
      <svg class="role-icon" viewBox="0 0 48 48" aria-hidden="true">
        <path d="M13 24c1.6-7 5.4-12 11-12s9.4 5 11 12"></path>
        <path d="M9 25c8.8 3 21.2 3 30 0"></path>
        <path d="M15 34h18"></path>
      </svg>
    `,
  };

  return icons[role];
}

export function clueIcon(): string {
  return `
    <svg class="role-icon clue-icon" viewBox="0 0 48 48" aria-hidden="true">
      <path d="M24 8v6"></path>
      <path d="M12.7 12.7 17 17"></path>
      <path d="M35.3 12.7 31 17"></path>
      <path d="M24 17c-5 0-9 3.8-9 8.6 0 3.1 1.6 5.6 4.1 7.1V38h9.8v-5.3c2.5-1.5 4.1-4 4.1-7.1 0-4.8-4-8.6-9-8.6Z"></path>
      <path d="M20 42h8"></path>
    </svg>
  `;
}

export function playerIcon(): string {
  return `
    <svg class="player-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="4"></circle>
      <path d="M5 21c1.4-5 4-7.5 7-7.5s5.6 2.5 7 7.5"></path>
    </svg>
  `;
}

export function menuIcon(): string {
  return `
    <svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16"></path>
      <path d="M4 12h16"></path>
      <path d="M4 17h16"></path>
    </svg>
  `;
}

export function replayIcon(): string {
  return `
    <svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 12a8 8 0 0 1 13.7-5.7L20 8"></path>
      <path d="M20 4v4h-4"></path>
      <path d="M20 12a8 8 0 0 1-13.7 5.7L4 16"></path>
      <path d="M4 20v-4h4"></path>
    </svg>
  `;
}

export function setupIcon(): string {
  return `
    <svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.1 2.1-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V20h-3v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-2.1-2.1.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H4v-3h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 2.1-2.1.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V4h3v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 2.1 2.1-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2v3h-.2a1.7 1.7 0 0 0-1.5 1Z"></path>
    </svg>
  `;
}

export function closeIcon(): string {
  return `
    <svg class="action-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 6 12 12"></path>
      <path d="M18 6 6 18"></path>
    </svg>
  `;
}
