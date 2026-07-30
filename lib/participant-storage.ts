// Lets a registered participant's own browser recognize "this is me" after
// a draw, without any login — the id is a capability token, not a session.
// This is a convenience complement to the email/magic-link flow (Mis
// Premios), not a replacement: it only works on the same browser/device
// that registered.

function storageKey(slug: string) {
  return `wb-sorteo-participant-${slug}`;
}

export function saveParticipantId(slug: string, participantId: string) {
  try {
    window.localStorage.setItem(storageKey(slug), participantId);
  } catch {
    // Storage blocked (private mode, etc.) — non-essential, ignore.
  }
}

export function getParticipantId(slug: string): string | null {
  try {
    return window.localStorage.getItem(storageKey(slug));
  } catch {
    return null;
  }
}
