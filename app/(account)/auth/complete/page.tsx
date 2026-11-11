import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { CompleteAuthForm } from "@/components/player/AccountForms";
export const metadata: Metadata = {
  title: "Вход в аккаунт",
  robots: { index: false, follow: false },
};
export default function CompleteAuthPage() {
  return (
    <Card className="mx-auto max-w-lg p-6 sm:p-9">
      <h1 className="mb-5 text-2xl">Возвращаемся на орбиту</h1>
      <CompleteAuthForm />
    </Card>
  );
}
