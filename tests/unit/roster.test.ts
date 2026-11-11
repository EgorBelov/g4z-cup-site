import { describe, expect, it } from "vitest";
import { parseForm } from "@/lib/actions/state";
import { rosterSchema } from "@/lib/validation/schemas";

function form(ids = ["23", "17", ""]) {
  const data = new FormData();
  data.set("team_id", "4");
  data.set("roster_version", "9");
  data.set("captain", "2");
  ids.forEach((id, index) => {
    data.append("player_id", id);
    data.append("nickname", `Player ${index + 1}`);
    data.append("real_name", "");
    data.append("role", "");
    data.append("mmr", "");
    data.append("is_standin", index === 2 ? "true" : "false");
  });
  return data;
}

describe("roster form identities", () => {
  it("keeps explicit IDs in submitted order and distinguishes a new player", () => {
    const result = parseForm(rosterSchema, form());
    expect(result.state).toBeUndefined();
    expect(result.data?.player_id).toEqual([23, 17, null]);
    expect(result.data?.roster_version).toBe(9);
  });
  it.each([["17", "17"], ["-1"], ["1.5"], ["9007199254740993"], ["17 OR 1=1"]])(
    "rejects duplicate or invalid IDs %j",
    (...ids) => {
      expect(parseForm(rosterSchema, form(ids)).state?.ok).toBe(false);
    },
  );
  it("rejects a missing ID array instead of falling back to row positions", () => {
    const data = form();
    data.delete("player_id");
    expect(parseForm(rosterSchema, data).state?.ok).toBe(false);
  });
  it("rejects a missing version, missing row and an out-of-range captain", () => {
    const missingVersion = form();
    missingVersion.delete("roster_version");
    expect(parseForm(rosterSchema, missingVersion).state?.ok).toBe(false);
    const missingRow = form();
    missingRow.set("role", "");
    expect(parseForm(rosterSchema, missingRow).state?.ok).toBe(false);
    const badCaptain = form();
    badCaptain.set("captain", "99");
    expect(parseForm(rosterSchema, badCaptain).state?.ok).toBe(false);
  });
  it("allows clearing the captain's row to remove that player", () => {
    const data = form();
    data.delete("nickname");
    ["First", "", "Third"].forEach((name) => data.append("nickname", name));
    expect(parseForm(rosterSchema, data).state).toBeUndefined();
  });
});
