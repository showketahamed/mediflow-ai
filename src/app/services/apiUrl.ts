const DEFAULT_API_URL = "http://localhost:4000/api/v1";

export function resolveApiUrl(value = import.meta.env.VITE_API_URL): string {
  const candidate = value?.trim() || DEFAULT_API_URL;

  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("Unsupported protocol");
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return DEFAULT_API_URL;
  }
}
