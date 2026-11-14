import { NextResponse, type NextRequest } from "next/server";
import { verifiedTelegramSession } from "@/lib/auth/player";
import { allowedAuthOrigin } from "@/lib/auth/origin";
import { authSecret } from "@/lib/env";
import { discordConfigured, discordRedirectUri } from "@/lib/discord/config";
import { authorizeUrl } from "@/lib/discord/oauth";
import {
  DISCORD_STATE_COOKIE,
  DISCORD_STATE_TTL,
  discordNonce,
  sealDiscordState,
} from "@/lib/discord/state";

/** Only pages inside the player cabinet can be the return target. */
function profileReturn(value: string | null): string {
  return value && /^\/me(\/[A-Za-z0-9/_-]{0,80})?$/.test(value) ? value : "/me/profile";
}

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  if (!allowedAuthOrigin(origin))
    return NextResponse.redirect(new URL("/me/profile?discord=origin", origin));

  const session = await verifiedTelegramSession(true);
  if (!session)
    return NextResponse.redirect(new URL("/login?next=/me/profile", origin));

  if (!discordConfigured())
    return NextResponse.redirect(new URL("/me/profile?discord=off", origin));

  const state = sealDiscordState(
    {
      profile: session.user.id,
      origin,
      next: profileReturn(request.nextUrl.searchParams.get("next")),
      nonce: discordNonce(),
    },
    authSecret(),
  );

  const response = NextResponse.redirect(
    authorizeUrl({ state, redirectUri: discordRedirectUri(origin) }),
  );
  response.cookies.set(DISCORD_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: origin.startsWith("https://"),
    path: "/",
    maxAge: DISCORD_STATE_TTL,
  });
  return response;
}
