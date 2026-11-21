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
  message?: string;
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
    const publicMessages = new Set([
      "Delivery staff service zone must match the order city or postal code",
      "Choose an active delivery staff member with an approved license",
      "An in-progress delivery cannot be reassigned",
      "A license is already awaiting review or approved",
      "Delivery status transition is not allowed",
      "Add a short reason when reporting a failed delivery",
    ]);
    response.status(400).json({
      error: error.message && publicMessages.has(error.message)
        ? error.message
        : "The submitted data is not valid for this operation.",
    });
    return;
  }

  if (error.code === "P0001") {
    const operationMessages = new Set([
      "An in-progress delivery cannot be reassigned",
      "Service zone cannot change while active deliveries are outside the new zone",
    ]);
    response.status(409).json({
      error:
        error.message && operationMessages.has(error.message)
          ? error.message
          : "The requested operation is no longer available. Refresh and try again.",
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
