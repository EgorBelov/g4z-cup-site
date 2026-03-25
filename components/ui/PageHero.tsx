import PrimaryButton from "@/components/ui/PrimaryButton";
import SecondaryButton from "@/components/ui/SecondaryButton";
import SectionCard from "@/components/ui/SectionCard";

type Action = {
  href: string;
  label: string;
  variant?: "primary" | "secondary";
};

type Props = {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: Action[];
  children?: React.ReactNode;
};

export default function PageHero({
  eyebrow,
  title,
  description,
  actions = [],
  children,
}: Props) {
  return (
    <SectionCard>
      <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">
        {eyebrow}
      </p>

      <h1 className="mt-2 text-4xl font-extrabold tracking-tight md:text-5xl">
        {title}
      </h1>

      {description && (
        <p className="mt-4 max-w-2xl text-white/65">{description}</p>
      )}

      {actions.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-3">
          {actions.map((action) =>
            action.variant === "primary" ? (
              <PrimaryButton key={action.href} href={action.href}>
                {action.label}
              </PrimaryButton>
            ) : (
              <SecondaryButton key={action.href} href={action.href}>
                {action.label}
              </SecondaryButton>
            )
          )}
        </div>
      )}

      {children && <div className="mt-6">{children}</div>}
    </SectionCard>
  );
}