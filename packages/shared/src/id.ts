/**
 * Generator ID untuk entitas.
 * Menggunakan crypto.randomUUID() bila tersedia (Node 19+, browser modern),
 * fallback ke Math.random + timestamp bila tidak.
 */

/**
 * Generate UUID v4 string.
 */
export function uuid(): string {
  // Browser & Node 19+
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback (Node lama)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate timestamp ISO 8601 dengan timezone lokal.
 */
export function nowTimestamp(): string {
  // Lazy import untuk hindari circular dep
  // date.ts sudah handle timezone
  const now = new Date();
  const tzOffset = -now.getTimezoneOffset();
  const sign = tzOffset >= 0 ? "+" : "-";
  const absOffset = Math.abs(tzOffset);
  const offsetHours = String(Math.floor(absOffset / 60)).padStart(2, "0");
  const offsetMinutes = String(absOffset % 60).padStart(2, "0");

  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = now.getFullYear();
  const mm = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = pad(now.getHours());
  const min = pad(now.getMinutes());
  const ss = pad(now.getSeconds());

  return `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}${sign}${offsetHours}:${offsetMinutes}`;
}
