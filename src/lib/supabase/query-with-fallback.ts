import { logSupabaseQuery } from "@/lib/supabase/query-log";

type SupabaseQueryLike<T> = {
  data: T;
  error: {
    code?: string;
    message: string;
    details?: string | null;
    hint?: string | null;
  } | null;
};

type FetchWithFallbackOptions<TPrimary, TFallback> = {
  primaryLabel: string;
  fallbackLabel: string;
  primary: () => PromiseLike<SupabaseQueryLike<TPrimary>>;
  fallback: () => PromiseLike<SupabaseQueryLike<TFallback>>;
  missingField: string;
  onMissingFieldError?: (error: NonNullable<SupabaseQueryLike<TPrimary>["error"]>) => void;
};

function isMissingColumnError(
  error: SupabaseQueryLike<unknown>["error"],
  missingField: string
): error is NonNullable<SupabaseQueryLike<unknown>["error"]> {
  return Boolean(error?.code === "42703" && error.message?.includes(missingField));
}

export async function fetchSupabaseWithFallback<TPrimary, TFallback>({
  primaryLabel,
  fallbackLabel,
  primary,
  fallback,
  missingField,
  onMissingFieldError,
}: FetchWithFallbackOptions<TPrimary, TFallback>) {
  const primaryResult = logSupabaseQuery(primaryLabel, await primary());

  if (!isMissingColumnError(primaryResult.error, missingField)) {
    return {
      data: primaryResult.data as TPrimary | null,
      error: primaryResult.error,
    };
  }

  onMissingFieldError?.(primaryResult.error);
  const fallbackResult = logSupabaseQuery(fallbackLabel, await fallback());
  return {
    data: fallbackResult.data as TFallback | null,
    error: fallbackResult.error,
  };
}
