import Link from "next/link";
import { adminLoginAction } from "@/app/admin/login/actions";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const hasError = params.error === "1";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-md items-center px-6">
        <div className="w-full rounded-3xl border border-white/10 bg-white/5 p-8">
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">
            Admin Access
          </p>

          <h1 className="mt-3 text-3xl font-extrabold tracking-tight">
            Вход в админку
          </h1>

          <p className="mt-3 text-white/65">
            Введите пароль организатора, чтобы открыть панель управления
            турниром.
          </p>

          {hasError && (
            <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              Неверный пароль.
            </div>
          )}

          <form action={adminLoginAction} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-white/70"
              >
                Пароль
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
                placeholder="Введите пароль"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-emerald-600 px-5 py-3 font-medium hover:bg-emerald-500"
            >
              Войти
            </button>
          </form>

          <div className="mt-5">
            <Link
              href="/"
              className="text-sm text-white/60 hover:text-white/90"
            >
              ← Вернуться на сайт
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
