"use client";

import { useActionState } from "react";
import { Field, Input } from "@/components/ui/Field";
import { FormFeedback, SubmitButton } from "@/components/ui/Form";
import { loginAction } from "@/lib/actions/auth";
import { idle } from "@/lib/actions/state";

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [state, action] = useActionState(loginAction, idle);

  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="redirectTo" value={redirectTo} />

      <Field label="Пароль" htmlFor="password" error={state.fieldErrors?.password}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          autoFocus
        />
      </Field>

      <FormFeedback state={state} />

      <SubmitButton className="w-full" pendingLabel="Проверяем…">
        Войти
      </SubmitButton>
    </form>
  );
}
