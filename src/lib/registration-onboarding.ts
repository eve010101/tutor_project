import type { UserRole } from "@/types/auth";

const STORAGE_PREFIX = "yanqi-registration-onboarding";

function getStorageKey(userId: string, role: UserRole, state: "pending" | "dismissed") {
  return `${STORAGE_PREFIX}:${userId}:${role}:${state}`;
}

export function markRegistrationOnboardingPending(userId: string, role: UserRole) {
  try {
    window.localStorage.setItem(getStorageKey(userId, role, "pending"), "true");
    window.localStorage.removeItem(getStorageKey(userId, role, "dismissed"));
  } catch {
    // Registration should still succeed when storage is unavailable.
  }
}

export function shouldShowRegistrationOnboarding(userId: string, role: UserRole) {
  try {
    return (
      window.localStorage.getItem(getStorageKey(userId, role, "pending")) === "true" &&
      window.localStorage.getItem(getStorageKey(userId, role, "dismissed")) !== "true"
    );
  } catch {
    return false;
  }
}

export function dismissRegistrationOnboarding(userId: string, role: UserRole) {
  try {
    window.localStorage.setItem(getStorageKey(userId, role, "dismissed"), "true");
    window.localStorage.removeItem(getStorageKey(userId, role, "pending"));
  } catch {
    // The banner can still be hidden for the current render.
  }
}
