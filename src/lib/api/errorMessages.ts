/**
 * Map a backend error to an i18n key.
 *
 * The Rust side returns a structured error `{ code, detail }` from a failed
 * chat/connection/model call (emitted on the "chat:error" event or thrown by an
 * invoke). This pure function maps the stable `code` to a translation key under
 * `errors.*`; the human string is resolved by the caller via `t(key)`. The
 * free-form `detail` is for logging / "view raw", not user display.
 */
export interface AppError {
  /** Stable machine code from the backend. */
  code: string;
  /** Optional human/technical detail (not localized). */
  detail?: string;
}

const CODE_TO_KEY: Record<string, string> = {
  auth: "errors.authFailed",
  quota: "errors.quotaExceeded",
  timeout: "errors.timeout",
  network: "errors.network",
  searchFailed: "errors.searchFailed",
};

/** Resolve an AppError code to its `errors.*` i18n key. */
export function errorMessageKey(error: AppError): string {
  return CODE_TO_KEY[error.code] ?? "errors.unknown";
}
