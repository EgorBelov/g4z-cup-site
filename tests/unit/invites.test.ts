import { describe, expect, it } from "vitest";
import { personalInviteRecipients, personalInvites } from "@/lib/utils/invites";

const cap = "6f9d3f8e-3f1a-4f4d-9c95-0f7a1f3f9d21";
const member = "1b2c3d4e-5f60-4a7b-8c9d-0e1f2a3b4c5d";

describe("invite recipients", () => {
  it("drops shareable links that have no recipient", () => {
    expect(
      personalInviteRecipients([
        { recipient_id: cap },
        { recipient_id: null },
        { recipient_id: member },
      ]),
    ).toEqual([cap, member]);
  });

  it("survives a team with nothing but a link invite", () => {
    expect(personalInviteRecipients([{ recipient_id: null }])).toEqual([]);
    expect(personalInviteRecipients([])).toEqual([]);
  });

  it("deduplicates the same recipient", () => {
    expect(
      personalInviteRecipients([{ recipient_id: cap }, { recipient_id: cap }]),
    ).toEqual([cap]);
  });

  it("keeps the link invites out of the pending list", () => {
    const invites = [
      { id: 1, recipient_id: cap },
      { id: 2, recipient_id: null },
    ];
    expect(personalInvites(invites).map((invite) => invite.id)).toEqual([1]);
  });
});
