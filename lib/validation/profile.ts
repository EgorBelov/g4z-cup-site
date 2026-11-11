export function normalizeProfileUrl(
  raw: string,
  kind: "steam" | "faceit" | "dotabuff",
): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Укажите полную ссылку с https://");
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.port
  )
    throw new Error("Некорректная ссылка");
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const path = url.pathname.replace(/\/+$/, "");
  if (
    kind === "steam" &&
    host === "steamcommunity.com" &&
    /^\/(id\/[A-Za-z0-9_-]{2,64}|profiles\/\d{17})$/.test(path)
  )
    return `https://steamcommunity.com${path.toLowerCase()}`;
  if (
    kind === "faceit" &&
    host === "faceit.com" &&
    /^\/(en|ru)\/players\/[A-Za-z0-9_-]{1,64}(\/stats)?$/.test(path)
  )
    return `https://www.faceit.com${path.replace(/\/stats$/, "")}`;
  if (
    kind === "dotabuff" &&
    host === "dotabuff.com" &&
    /^\/players\/\d{1,20}$/.test(path)
  )
    return `https://www.dotabuff.com${path}`;
  throw new Error(
    kind === "steam"
      ? "Нужна ссылка steamcommunity.com/id/… или /profiles/…"
      : kind === "faceit"
        ? "Нужна ссылка faceit.com/en/players/… или /ru/players/…"
        : "Нужна ссылка dotabuff.com/players/…",
  );
}

/** Only known internal destinations; never turn an OAuth callback into a redirector. */
export function safePlayerReturn(value: unknown): string {
  if (typeof value !== "string" || value.length > 300 || /[\\\r\n]/.test(value))
    return "/me";
  if (
    /^\/me(?:\/[a-z0-9/-]+)?$/.test(value) ||
    /^\/t\/[a-z0-9-]+\/register$/.test(value) ||
    /^\/invite\/[A-Za-z0-9_-]{40,64}$/.test(value)
  )
    return value;
  return "/me";
}
