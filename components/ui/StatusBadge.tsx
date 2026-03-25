type Props = {
  status: string;
};

function getStatusLabel(status: string) {
  switch (status) {
    case "live":
      return "LIVE";
    case "finished":
      return "Завершен";
    default:
      return "Скоро";
  }
}

function getStatusClasses(status: string) {
  switch (status) {
    case "live":
      return "border-red-500/30 bg-red-500/15 text-red-300";
    case "finished":
      return "border-emerald-500/30 bg-emerald-500/15 text-emerald-300";
    default:
      return "border-white/10 bg-white/5 text-white/70";
  }
}

export default function StatusBadge({ status }: Props) {
  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
        status
      )}`}
    >
      {getStatusLabel(status)}
    </span>
  );
}