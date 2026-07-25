import type { ZodType } from "zod";

/** Shape every form action returns, consumed with `useActionState`. */
export type ActionState = {
  ok?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export const idle: ActionState = {};

export function fail(error: string): ActionState {
  return { ok: false, error };
}

export function done(message?: string): ActionState {
  return { ok: true, message };
}

/**
 * Validates form data against a schema, returning either the parsed value or a
 * ready-to-render error state. Every mutation goes through this — a server
 * action is a public POST endpoint, so nothing may reach the database unchecked.
 */
export function parseForm<T>(
  schema: ZodType<T>,
  formData: FormData,
): { data: T; state?: undefined } | { data?: undefined; state: ActionState } {
  const raw: Record<string, unknown> = {};

  for (const key of new Set(formData.keys())) {
    const values = formData.getAll(key);
    raw[key] = values.length > 1 ? values : values[0];
  }

  const parsed = schema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "form";
      fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
    }

    return {
      state: {
        ok: false,
        error: "Проверьте заполненные поля",
        fieldErrors,
      },
    };
  }

  return { data: parsed.data };
}
