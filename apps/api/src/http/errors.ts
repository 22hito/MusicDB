import type { Problem } from "@musicdb/contracts";

/** Помилка API → відповідь application/problem+json з машинним кодом. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly errors?: Problem["errors"],
  ) {
    super(message);
  }

  toProblem(): Problem {
    return {
      type: "about:blank",
      title: this.message,
      status: this.status,
      code: this.code,
      ...(this.errors ? { errors: this.errors } : {}),
    };
  }
}

export const badRequest = (code: string, message = "Некоректний запит") => new ApiError(400, code, message);
export const unauthorized = () => new ApiError(401, "unauthorized", "Потрібно увійти");
export const forbidden = (code = "forbidden", message = "Недостатньо прав") =>
  new ApiError(403, code, message);
export const notFound = (what = "resource") => new ApiError(404, `${what}_not_found`, "Не знайдено");
export const conflict = (code: string, message: string) => new ApiError(409, code, message);
export const tooMany = (message = "Забагато запитів, спробуйте пізніше") =>
  new ApiError(429, "rate_limited", message);
