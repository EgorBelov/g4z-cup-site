#!/usr/bin/env node
/**
 * Generates the ADMIN_PASSWORD_HASH value.
 *
 *   npm run hash-password -- "your-password"
 *
 * Keep the password out of shell history where you can (use a leading space in
 * bash, or run without arguments and type it when prompted).
 */
import { randomBytes, scryptSync } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const KEY_LENGTH = 64;
const COST = 1 << 15;
const MAX_MEM = 64 * 1024 * 1024;

async function readPassword() {
  const fromArgs = process.argv.slice(2).join(" ").trim();
  if (fromArgs) return fromArgs;

  const rl = createInterface({ input: stdin, output: stdout });
  const answer = await rl.question("Пароль организатора: ");
  rl.close();
  return answer.trim();
}

const password = await readPassword();

if (password.length < 10) {
  console.error("Пароль должен быть не короче 10 символов.");
  process.exit(1);
}

const salt = randomBytes(16);
const hash = scryptSync(password.normalize("NFKC"), salt, KEY_LENGTH, {
  N: COST,
  maxmem: MAX_MEM,
});

console.log("\nДобавьте в .env.local (и в переменные окружения Vercel):\n");
console.log(
  `ADMIN_PASSWORD_HASH="scrypt$${COST}$${salt.toString("hex")}$${hash.toString("hex")}"`,
);
console.log();
