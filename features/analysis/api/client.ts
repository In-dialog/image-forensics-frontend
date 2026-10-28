const API = "/api/analysis";

export async function analysisRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, { cache: "no-store", ...options });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new Error("Cannot reach the local analysis service. Check that the local launcher is running, then try again.");
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error || `The analysis service returned an error (${response.status}).`);
  }
  if (!body) throw new Error("The analysis service returned an empty response. Please try again.");
  return body as T;
}

export const jsonBody = (body: unknown): RequestInit => ({
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
