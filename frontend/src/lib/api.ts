const apiUrl = (
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? "http://localhost:4000" : "")
).replace(/\/$/, "");

export class ApiRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

export function isRateLimitedError(error: unknown): boolean {
  return error instanceof ApiRequestError && error.status === 429;
}

function isErrorPayload(value: unknown): value is { error: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
  );
}

export async function apiRequest<T>(
  path: string,
  accessToken?: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${apiUrl}/api${path}`, {
    ...init,
    headers,
  });
  if (response.status === 204) return undefined as T;

  const responseText = await response.text();
  let payload: unknown;
  if (responseText) {
    try {
      payload = JSON.parse(responseText) as unknown;
    } catch {
      payload = undefined;
    }
  }
  if (!response.ok) {
    const plainTextError =
      response.headers.get("content-type")?.includes("text/plain")
        ? responseText.trim().slice(0, 200)
        : "";
    throw new ApiRequestError(
      (isErrorPayload(payload) && payload.error) ||
        plainTextError ||
        `Request failed with status ${response.status}.`,
      response.status,
    );
  }
  if (payload === undefined) {
    throw new Error("The API returned an invalid JSON response.");
  }
  return payload as T;
}
