/**
 * Team invitations come in two shapes since `0016`: a personal invite has a
 * recipient, a shareable link has only a token hash.
 *
 * A link invite must never reach a uuid query — `in ("…", null)` makes Postgres
 * reject the whole statement and takes the cabinet page down.
 */
export type InviteLike = { recipient_id: string | null };

export function personalInviteRecipients(invites: readonly InviteLike[]): string[] {
  return [
    ...new Set(
      invites
        .map((invite) => invite.recipient_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];
}

/** Personal invites only, in the order the database returned them. */
export function personalInvites<T extends InviteLike>(invites: readonly T[]): T[] {
  return invites.filter((invite) => Boolean(invite.recipient_id));
}
