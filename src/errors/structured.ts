export type ErrorCode =
  | 'NETWORK_MANIFEST_FETCH'
  | 'NETWORK_ANNOTATION_FETCH'
  | 'NETWORK_SEARCH_FETCH'
  | 'PARSING_MANIFEST'
  | 'SELECTION_FAILED'
  | 'SEARCH_UNSUPPORTED'
  | 'UNKNOWN';

export interface StructuredError extends Error {
  code: ErrorCode;
  recoverable?: boolean;
  cause?: unknown;
}

export function createError(
  code: ErrorCode,
  message: string,
  options: { recoverable?: boolean; cause?: unknown } = {}
): StructuredError {
  const err = new Error(message) as StructuredError;
  err.code = code;
  if (options.recoverable !== undefined) err.recoverable = options.recoverable;
  if (options.cause !== undefined) err.cause = options.cause;
  return err;
}

export function toUserMessage(err: unknown): string {
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object' && 'message' in err) {
    return (err as any).message || 'An unexpected error occurred.';
  }
  return 'An unexpected error occurred.';
}
