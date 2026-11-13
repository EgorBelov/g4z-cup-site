import type { Metadata } from "next";
import Link from "next/link";
import { CompleteAuthForm } from "@/components/player/AccountForms";
export const metadata: Metadata = {
  title: "Вход в аккаунт",
  robots: { index: false, follow: false },
};
export default function CompleteAuthPage() {
  return (
    <div className="orbit-auth">
      <section className="orbit-auth-side orbit-frame">
        <p className="label">Вход</p>
        <h1>Возвращаемся на орбиту.</h1>
        <p>
          Проверяем подтверждение из Telegram и возвращаем вас на сайт. Обычно это
          занимает пару секунд.
        </p>
      </section>

      <section className="orbit-auth-card orbit-frame">
        <h2>Завершаем вход</h2>
        <p className="lead">
          Данные пришли из Telegram. Если страница не переключится сама — нажмите
          «Продолжить».
        </p>

        <CompleteAuthForm />

        <p className="orbit-auth-foot">
          Не получилось?{" "}
          <Link prefetch={false} href="/login">
            Войти заново
          </Link>
        </p>
      </section>
    </div>
  );
}
