import { NotFoundBlock } from "@/components/system/NotFoundBlock";

/**
 * Внутри группы (account) шапку и подвал даёт layout группы,
 * поэтому здесь только тело — иначе шапка дублируется.
 */
export default function AccountNotFound() {
  return <NotFoundBlock />;
}
