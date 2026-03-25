import Container from "@/components/layout/Container";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-slate-950">
      <Container>
        <div className="flex flex-col gap-2 py-8 text-sm text-white/45 md:flex-row md:items-center md:justify-between">
          <p>© G4Z CUP 10 — Spring Dota 2 Tournament</p>
          <p>Schedule, groups, playoff bracket and match pages</p>
        </div>
      </Container>
    </footer>
  );
}