import { describe, expect, it } from "vitest";
import { openToken, sealToken } from "@/lib/discord/tokens";

const SECRET = "a".repeat(48);

describe("discord token storage", () => {
  it("round-trips a token", () => {
    const sealed = sealToken("access-token-value", SECRET);
    expect(sealed).not.toContain("access-token-value");
    expect(openToken(sealed, SECRET)).toBe("access-token-value");
  });

  it("never produces the same ciphertext twice", () => {
    expect(sealToken("same", SECRET)).not.toBe(sealToken("same", SECRET));
  });

  it("rejects a token sealed with another secret", () => {
    const sealed = sealToken("access-token-value", SECRET);
    expect(openToken(sealed, "b".repeat(48))).toBeNull();
  });

  it("rejects tampered ciphertext", () => {
    const sealed = sealToken("access-token-value", SECRET);
    const chars = [...sealed];
    const at = 40;
    chars[at] = chars[at] === "A" ? "B" : "A";
    expect(openToken(chars.join(""), SECRET)).toBeNull();
  });

  it("treats missing and malformed values as absent", () => {
    expect(openToken(null, SECRET)).toBeNull();
    expect(openToken(undefined, SECRET)).toBeNull();
    expect(openToken("", SECRET)).toBeNull();
    expect(openToken("not base64!", SECRET)).toBeNull();
    expect(openToken("AAAA", SECRET)).toBeNull();
  });
});
