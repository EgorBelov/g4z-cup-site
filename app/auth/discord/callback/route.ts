import { NextResponse, type NextRequest } from "next/server";
import { verifiedPlayerSession } from "@/lib/auth/player";
import { allowedAuthOrigin } from "@/lib/auth/origin";
import { authSecret } from "@/lib/env";
import { discordConfigured, discordRedirectUri } from "@/lib/discord/config";
import { exchangeCode, oauthUser } from "@/lib/discord/oauth";
import { linkDiscord } from "@/lib/discord/provision";
import { DISCORD_STATE_COOKIE, openDiscordState } from "@/lib/discord/state";

/**
 * OAuth callback: verifies the sealed state, exchanges the code, links the
 * account and adds the player to the server. Every failure lands back on the
 * profile page with a short reason instead of a stack trace.
 */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  // A callback on an unexpected domain would set cookies on the wrong host.
  if (!allowedAuthOrigin(origin))
    return NextResponse.redirect(new URL("/me/profile?discord=origin", origin));

  const close = (target: string) => {
    const response = NextResponse.redirect(new URL(target, origin));
    response.cookies.delete(DISCORD_STATE_COOKIE);
    return response;
  };

  const params = request.nextUrl.searchParams;
  const cookie = request.cookies.get(DISCORD_STATE_COOKIE)?.value;
  const state = openDiscordState(cookie, authSecret());

  if (!state || state.origin !== origin || params.get("state") !== cookie)
    return close("/me/profile?discord=state");

  if (params.get("error")) return close("/me/profile?discord=denied");
  const code = params.get("code");
  if (!code) return close("/me/profile?discord=code");

  const session = await verifiedPlayerSession(true);
  if (!session || session.user.id !== state.profile)
    return close("/me/profile?discord=session");

  if (!discordConfigured()) return close("/me/profile?discord=off");

  try {
    const tokens = await exchangeCode(code, discordRedirectUri(origin));
    const user = await oauthUser(tokens.access_token);
    await linkDiscord(state.profile, { user, tokens });
    const separator = state.next.includes("?") ? "&" : "?";
    return close(`${state.next}${separator}discord=linked`);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "";
    console.error("discord link failed:", message);
    return close(
      message.includes("другому аккаунту")
        ? "/me/profile?discord=taken"
        : "/me/profile?discord=error",
    );
  }
}
