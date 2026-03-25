type Props = {
  href: string;
  children: React.ReactNode;
  variant?: "purple" | "sky";
};

export default function ExternalButton({
  href,
  children,
  variant = "purple",
}: Props) {
  const styles =
    variant === "sky"
      ? "bg-sky-600 hover:bg-sky-500"
      : "bg-purple-600 hover:bg-purple-500";

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`rounded-2xl px-4 py-3 text-sm font-medium text-white transition ${styles}`}
    >
      {children}
    </a>
  );
}