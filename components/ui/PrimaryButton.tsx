import Link from "next/link";

type Props = {
  href: string;
  children: React.ReactNode;
};

export default function PrimaryButton({ href, children }: Props) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-4 py-3 font-medium text-white transition hover:bg-emerald-500 active:scale-[0.99]"
    >
      {children}
    </Link>
  );
}