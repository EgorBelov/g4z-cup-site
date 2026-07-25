import { describe, expect, it } from "vitest";
import {
  SESSION_TTL_SECONDS,
  createSessionToken,
  verifySessionToken,
} from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

const SECRET = "a".repeat(48);

describe("session tokens", () => {
  it("accepts a token it just issued", async () => {
    const token = await createSessionToken(SECRET);
    expect(await verifySessionToken(token, SECRET)).toBe(true);
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await createSessionToken(SECRET);
    expect(await verifySessionToken(token, "b".repeat(48))).toBe(false);
  });

  it("rejects a tampered payload", async () => {
    const token = await createSessionToken(SECRET);
    const [payload, signature] = token.split(".");
    const forged = `${payload}x.${signature}`;

    expect(await verifySessionToken(forged, SECRET)).toBe(false);
  });

  it("rejects the v1 magic string", async () => {
    // The previous site trusted a cookie whose value was literally
    // "authorized", so anyone could set it by hand.
    expect(await verifySessionToken("authorized", SECRET)).toBe(false);
  });

  it("rejects garbage and empty values", async () => {
    expect(await verifySessionToken(undefined, SECRET)).toBe(false);
    expect(await verifySessionToken("", SECRET)).toBe(false);
    expect(await verifySessionToken("....", SECRET)).toBe(false);
    expect(await verifySessionToken("no-dot-here", SECRET)).toBe(false);
  });

  it("expires", async () => {
    const issuedAt = Date.now();
    const token = await createSessionToken(SECRET, issuedAt);

    const justBefore = issuedAt + (SESSION_TTL_SECONDS - 5) * 1000;
    const justAfter = issuedAt + (SESSION_TTL_SECONDS + 5) * 1000;

    expect(await verifySessionToken(token, SECRET, justBefore)).toBe(true);
    expect(await verifySessionToken(token, SECRET, justAfter)).toBe(false);
  });

  it("issues a different token every time", async () => {
    const first = await createSessionToken(SECRET);
    const second = await createSessionToken(SECRET);
    expect(first).not.toBe(second);
  });
});

describe("password hashing", () => {
  it("verifies the right password and rejects the wrong one", async () => {
    const stored = await hashPassword("correct horse battery staple");

    expect(stored.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("correct horse battery staple", stored)).toBe(true);
    expect(await verifyPassword("Correct horse battery staple", stored)).toBe(false);
    expect(await verifyPassword("", stored)).toBe(false);
  });

  it("salts each hash", async () => {
    const first = await hashPassword("same-password");
    const second = await hashPassword("same-password");

    expect(first).not.toBe(second);
    expect(await verifyPassword("same-password", second)).toBe(true);
  });

  it("rejects malformed stored values instead of throwing", async () => {
    expect(await verifyPassword("x", "not-a-hash")).toBe(false);
    expect(await verifyPassword("x", "scrypt$32768$deadbeef")).toBe(false);
    expect(await verifyPassword("x", "bcrypt$1$2$3")).toBe(false);
  });
});
