const PREFIX = "caselab_participant_";

export function saveToken(code: string, token: string) {
  try {
    localStorage.setItem(PREFIX + code.toUpperCase(), token);
  } catch {
    /* storage may be unavailable */
  }
}

export function readToken(code: string): string | null {
  try {
    return localStorage.getItem(PREFIX + code.toUpperCase());
  } catch {
    return null;
  }
}

export function clearToken(code: string) {
  try {
    localStorage.removeItem(PREFIX + code.toUpperCase());
  } catch {
    /* ignore */
  }
}

/** Clears account/session-specific browser state without removing harmless design preferences. */
export function clearPrivateLocalStorage() {
  try {
    const prefixes = [PREFIX, "caselab-run-start-", "caselab-timer-"];
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (key && prefixes.some((prefix) => key.startsWith(prefix))) localStorage.removeItem(key);
    }
  } catch {
    /* storage may be unavailable */
  }
}
