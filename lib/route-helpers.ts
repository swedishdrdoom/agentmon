/**
 * Shared error handling for API route endpoints.
 */

import { NextResponse } from "next/server";

export function handleRouteError(error: unknown) {
  console.error("API error:", error);

  const message =
    error instanceof Error ? error.message : "Unknown error occurred";

  const isConfigError =
    message.includes("not configured") || message.includes("PLACEHOLDER");

  return NextResponse.json(
    { error: message, type: isConfigError ? "config_error" : "generation_error" },
    { status: isConfigError ? 503 : 500 }
  );
}
