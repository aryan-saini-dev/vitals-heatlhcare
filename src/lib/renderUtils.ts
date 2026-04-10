/**
 * Safe renderer for vitals and AI-generated fields.
 * Handles strings, numbers, arrays, and objects to avoid [object Object] errors.
 */
export function safeRender(val: any): string {
  if (val === null || val === undefined) return "N/A";
  if (typeof val === "string") return val.trim() || "N/A";
  if (typeof val === "number") return val.toString();
  if (Array.isArray(val)) {
    if (val.length === 0) return "None";
    return val.map(item => safeRender(item)).join(", ");
  }
  if (typeof val === "object") {
    // If it's a specific object type that we know how to handle, do it here.
    // Otherwise, stringify it for debugging/visibility rather than showing [object Object].
    try {
      return JSON.stringify(val);
    } catch {
      return "[Complex Data]";
    }
  }
  return String(val);
}
