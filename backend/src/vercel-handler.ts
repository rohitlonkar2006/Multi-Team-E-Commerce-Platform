import type { Request, Response } from "express";
import { app } from "./app.js";

const routeParameter = "__vercel_path";

export function vercelHandler(request: Request, response: Response): void {
  const requestUrl = new URL(request.url ?? "/", "http://vercel.local");
  const route = requestUrl.searchParams.get(routeParameter);

  if (
    !route ||
    route.startsWith("/") ||
    route.split("/").some((segment) => segment === "." || segment === "..")
  ) {
    response.status(404).json({ error: "API route not found." });
    return;
  }

  const searchParams = new URLSearchParams();
  let removedFrameworkPath = false;
  for (const [key, value] of requestUrl.searchParams) {
    if (key === routeParameter || key === "...route") {
      continue;
    }
    if (key === "path" && !removedFrameworkPath && value === route) {
      removedFrameworkPath = true;
      continue;
    }
    searchParams.append(key, value);
  }

  const query: Record<string, string | string[]> = {};
  for (const [key, value] of searchParams) {
    const current = query[key];
    if (current === undefined) {
      query[key] = value;
    } else if (Array.isArray(current)) {
      current.push(value);
    } else {
      query[key] = [current, value];
    }
  }

  const search = searchParams.toString();
  request.url = `/api/${route}${search ? `?${search}` : ""}`;
  Object.defineProperty(request, "query", {
    configurable: true,
    enumerable: true,
    value: query,
  });
  app(request, response);
}
