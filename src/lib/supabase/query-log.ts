type SupabaseErrorLike = {
  message: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
  cause?: unknown;
};

type SupabaseResultLike = {
  data: unknown;
  error: SupabaseErrorLike | null;
};

function getResultSize(data: unknown) {
  if (Array.isArray(data)) return data.length;
  return data == null ? 0 : 1;
}

function serializeErrorValue(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
      cause: serializeErrorValue(value.cause),
    };
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.getOwnPropertyNames(value).map((key) => [
        key,
        serializeErrorValue((value as Record<string, unknown>)[key]),
      ])
    );
  }

  return value;
}

export function getCompleteErrorDetails(error: unknown) {
  return serializeErrorValue(error);
}

/** Logs query health without writing row contents or personal data to the console. */
export function logSupabaseQuery<T extends SupabaseResultLike>(label: string, result: T): T {
  if (result.error) {
    const errorDetails = {
      code: result.error.code,
      message: result.error.message,
      details: result.error.details,
      hint: result.error.hint,
      cause: getCompleteErrorDetails(result.error.cause),
    };

    // Next.js dev overlays intercept console.error even when the caller handles it.
    console.log(`[Supabase] ${label} failed: ${JSON.stringify(errorDetails)}`);
  } else {
    console.log(`[Supabase] ${label} succeeded`, { rows: getResultSize(result.data) });
  }

  return result;
}
