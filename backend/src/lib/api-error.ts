export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type DatabaseError = {
  code?: string;
};

export function sendDatabaseError(
  response: import("express").Response,
  error: DatabaseError,
): void {
  if (error.code === "23505") {
    response.status(409).json({ error: "A record with these details already exists." });
    return;
  }

  if (error.code === "23503" || error.code === "23514" || error.code === "22P02") {
    response.status(400).json({ error: "The submitted data is not valid." });
    return;
  }

  if (error.code === "22023") {
    response.status(400).json({ error: "The submitted data is not valid for this operation." });
    return;
  }

  if (error.code === "P0001") {
    response.status(409).json({
      error: "The cart or stock state changed. Review your cart and try again.",
    });
    return;
  }

  if (error.code === "42501") {
    response.status(403).json({ error: "You are not allowed to perform this operation." });
    return;
  }

  if (error.code === "PGRST202" || error.code === "PGRST205") {
    response.status(503).json({
      error: "The required Supabase database migration has not been applied.",
    });
    return;
  }

  if (error.code === "P0002") {
    response.status(404).json({ error: "The requested record was not found." });
    return;
  }

  console.error("Supabase database request failed.", { code: error.code });
  response.status(500).json({ error: "The database request could not be completed." });
}
