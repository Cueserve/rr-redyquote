import type { PostgrestError } from "@supabase/supabase-js";

export function parseDbError(error: PostgrestError | null): string {
  if (!error) return "An unknown error occurred.";

  if (error.code === "42501") {
    return "You do not have permission to perform this action.";
  }

  if (error.code === "23505") {
    return "A record with this information already exists (unique violation).";
  }

  if (error.code === "23503") {
    return "This action is restricted because other records depend on it (foreign key violation).";
  }

  if (error.code === "23514") {
    return "The data provided is invalid for this field (check constraint violation).";
  }

  // Fallback to error message if it's a raised exception from a function (custom error)
  if (error.message) {
    // Some postgres functions RAISE EXCEPTION 'Custom message'.
    // Usually these are relatively friendly, but if they contain 'violates check constraint', we mask them.
    if (error.message.includes("violates check constraint")) {
      return "The data provided violates business rules.";
    }
    if (error.message.includes("violates row-level security policy")) {
      return "You do not have permission to perform this action.";
    }
    return error.message;
  }

  return "A database error occurred while processing your request.";
}
