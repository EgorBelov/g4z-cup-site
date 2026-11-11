import { isWriteConfigured } from "@/lib/supabase/write";
export function GET(request: Request) {
  const writeReady = isWriteConfigured();
  const authReady = (process.env.AUTH_SECRET?.length ?? 0) >= 32;
  return Response.json(
    {
      ok: writeReady && authReady,
      release: "registration-v1",
      writeReady,
      authReady,
      origin: new URL(request.url).origin,
    },
    {
      status: writeReady && authReady ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
