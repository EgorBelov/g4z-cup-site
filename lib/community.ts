/** Community links are independent of whichever tournament is current. */
export const community = {
  telegram: process.env.NEXT_PUBLIC_COMMUNITY_TELEGRAM_URL || "https://t.me/g4zagzes",
  stream:
    process.env.NEXT_PUBLIC_COMMUNITY_STREAM_URL || "https://www.twitch.tv/g4zcup_ru",
};
