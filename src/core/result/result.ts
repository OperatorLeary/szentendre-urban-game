export interface Success<TSuccess> {
  readonly ok: true;
  readonly value: TSuccess;
}

export interface Failure<TFailure> {
  readonly ok: false;
  readonly error: TFailure;
}

export type Result<TSuccess, TFailure = Error> =
  | Success<TSuccess>
  | Failure<TFailure>;

export const Result = {
  ok<TSuccess>(value: TSuccess): Success<TSuccess> {
    return {
      ok: true,
      value
    };
  },
  fail<TFailure>(error: TFailure): Failure<TFailure> {
    return {
      ok: false,
      error
    };
  }
} as const;
