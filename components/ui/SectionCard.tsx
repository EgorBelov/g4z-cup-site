type Props = {
  children: React.ReactNode;
  className?: string;
};

export default function SectionCard({ children, className = "" }: Props) {
  return (
    <section
      className={`rounded-[28px] border border-white/10 bg-white/5 p-6 md:p-8 ${className}`}
    >
      {children}
    </section>
  );
}