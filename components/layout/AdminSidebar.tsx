import Link from "next/link";

const adminNav = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/matches", label: "Матчи" },
  { href: "/admin/matches/new", label: "Новый матч" },
  { href: "/admin/teams", label: "Команды" },
  { href: "/admin/teams/new", label: "Новая команда" },
  { href: "/admin/groups", label: "Группы" },
  { href: "/admin/playoff", label: "Плей-офф" },
];

export default function AdminSidebar() {
  return (
    <aside className="w-full rounded-3xl border border-white/10 bg-white/5 p-4 lg:w-72">
      <div className="mb-4">
        <div className="text-sm uppercase tracking-[0.2em] text-emerald-300">
          Admin Panel
        </div>
        <div className="mt-2 text-2xl font-bold">G4Z CUP 10</div>
      </div>

      <nav className="space-y-2">
        {adminNav.map((item) => (
          <Link
            key={`${item.href}-${item.label}`}
            href={item.href}
            className="block rounded-2xl px-4 py-3 text-sm font-medium text-white/75 transition hover:bg-white/10 hover:text-white"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-6 border-t border-white/10 pt-4">
        <Link
          href="/"
          className="block rounded-2xl bg-white/10 px-4 py-3 text-sm font-medium hover:bg-white/15"
        >
          Вернуться на сайт
        </Link>
      </div>
    </aside>
  );
}