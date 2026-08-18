/**
 * Shared setup for the command line tools.
 *
 * Next loads .env.local for the app but scripts run outside that, so the file
 * is parsed here. Byte order marks and trailing whitespace are stripped on
 * the way out: both survive a copy between machines and both break the RPC
 * client with an error that names nothing useful.
 */

import { readFileSync } from "node:fs";
import { Connection, Keypair } from "@solana/web3.js";
import bs58 from "bs58";

export function clean(value: string | undefined) {
  const trimmed = value?.replace(/^﻿/, "").trim();
  return trimmed ? trimmed : undefined;
}

function loadEnv(): Record<string, string | undefined> {
  const env: Record<string, string | undefined> = {};
  for (const file of [".env.local", ".env"]) {
    let raw: string;
    try {
      raw = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    } catch {
      continue;
    }
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (m && env[m[1]] === undefined) env[m[1]] = clean(m[2]);
    }
  }
  return env;
}

const env = loadEnv();

const rpcRaw = clean(process.env.NEXT_PUBLIC_SOLANA_RPC) ?? env.NEXT_PUBLIC_SOLANA_RPC;
export const RPC = /^https?:\/\//i.test(rpcRaw ?? "")
  ? rpcRaw!
  : "https://api.devnet.solana.com";

export function signer(): Keypair {
  const secret = clean(process.env.SOLANA_DEMO_SECRET) ?? env.SOLANA_DEMO_SECRET;
  if (!secret) {
    console.error("SOLANA_DEMO_SECRET is not set. Put a devnet key in .env.local.");
    process.exit(1);
  }
  return secret.startsWith("[")
    ? Keypair.fromSecretKey(Uint8Array.from(JSON.parse(secret)))
    : Keypair.fromSecretKey(bs58.decode(secret));
}

export const connection = () => new Connection(RPC, "confirmed");

export const usd = (n: number) =>
  `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
