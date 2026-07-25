#!/usr/bin/env node
/** Generates AUTH_SECRET for signing the admin session cookie. */
import { randomBytes } from "node:crypto";

console.log(`AUTH_SECRET="${randomBytes(32).toString("hex")}"`);
