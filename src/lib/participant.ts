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
