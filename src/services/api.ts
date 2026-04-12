/**
 * Browser API URL.
 * - Set `VITE_API_URL` when the API is on another origin (e.g. production).
 * - In dev, defaults to relative `/api/...` on the Vite origin so requests go through the dev proxy
 *   (avoids hitting whatever random process is bound to :4000).
 * - Optional `VITE_DEV_API_ORIGIN=http://127.0.0.1:4000` to bypass the proxy.
 */
export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  const fromEnv = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "");
  if (fromEnv) return `${fromEnv}${p}`;
  if (import.meta.env.DEV) {
    const direct = (import.meta.env.VITE_DEV_API_ORIGIN as string | undefined)?.trim();
    if (direct) return `${direct.replace(/\/$/, "")}${p}`;
    return p;
  }
  return p;
}
