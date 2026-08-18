/**
 * What Clearcade puts on a public chain, and why that particular thing.
 *
 * The interesting claim is not "the ranking is on chain". A leaderboard
 * copied to a chain is still whatever the operator decided to copy. The claim
 * is narrower and harder to wriggle out of: before an epoch's ranking is
 * published, Clearcade commits a hash of the exact inputs and the exact
 * weights it intends to use. The inputs themselves are published in full.
 * Anyone can hash the published table and check it against the commitment.
 *
 * That leaves the operator three options and no others. Publish honest
 * numbers. Publish false numbers, in the open, where a creator with their own
 * analytics can contradict them. Or change the numbers after the fact and
 * fail the hash check for every visitor at once. What it cannot do is what
 * platforms do now, which is adjust the rule quietly and let creators guess.
 *
 * A database timestamp would establish none of this, because the operator
 * owns the database. The ordering has to come from somewhere the operator
 * cannot reach, and that is the entire reason a chain is here.
 */

import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import type { Metrics, Weights } from "./rank";

export const MEMO_PROGRAM_ID = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
);

/**
 * Environment values arrive carrying whatever wrote them — a byte order mark
 * from a UTF-8 file, a newline from a pipe. Both survive a deployment and
 * break the RPC client with an error that names nothing useful.
 */
export function cleanEnv(value: string | undefined): string | undefined {
  const trimmed = value?.replace(/^﻿/, "").trim();
  return trimmed ? trimmed : undefined;
}

const configured = cleanEnv(process.env.NEXT_PUBLIC_SOLANA_RPC);

export const RPC = /^https?:\/\//i.test(configured ?? "")
  ? (configured as string)
  : "https://api.devnet.solana.com";

export const EXPLORER = "https://explorer.solana.com";

/** Headroom under the 1232 byte transaction ceiling, less signature overhead. */
export const MEMO_MAX_BYTES = 900;

/**
 * Devnet payout scale, in lamports per US dollar of pool.
 *
 * The catalogue is denominated in dollars and devnet SOL is not worth
 * dollars, so payouts are scaled down to something a faucet can cover. The
 * factor is written into every receipt, because a transfer that looks like a
 * payment and is not one is worse than no transfer at all.
 */
export const DEVNET_LAMPORTS_PER_USD = 40;

/** A system account cannot be created holding less than this. */
export const RENT_EXEMPT_FLOOR = 890_880;

/**
 * The exact bytes that get hashed.
 *
 * Written out longhand rather than run through JSON.stringify, because the
 * point is that somebody reimplementing this in another language gets the
 * same string. Rows are sorted by game id, fields are comma separated in a
 * fixed order, rows are newline separated, and there is no trailing newline.
 * Every value is already an integer, so there is no formatting decision left
 * to make and no locale that can change one.
 */
export function canonicalInputs(epoch: number, metrics: Metrics[]): string {
  const rows = [...metrics]
    .sort((a, b) => a.gameId.localeCompare(b.gameId))
    .map((m) =>
      [m.gameId, m.sessions, m.players, m.returning, m.medianSeconds, m.ratingBps].join(","),
    );
  return [`epoch=${epoch}`, ...rows].join("\n");
}

/** SHA-256, hex, via the platform digest that both node and browsers ship. */
export async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export type EpochCommit = {
  epoch: number;
  weights: Weights;
  poolUsd: number;
  gameCount: number;
  inputsSha256: string;
};

/**
 * The commitment record. Small on purpose.
 *
 * The full input table is far too large for a memo and does not belong there
 * anyway — a hash is what makes tampering detectable, and the table is more
 * useful published where people can read it. The weights go in whole rather
 * than hashed, so a reader can see the rule change without needing anything
 * else in hand.
 */
export function encodeCommit(c: EpochCommit) {
  return JSON.stringify({
    p: "clearcade/v1",
    kind: "commit",
    epoch: c.epoch,
    w: [c.weights.reach, c.weights.retention, c.weights.depth, c.weights.rating],
    pool_usd: c.poolUsd,
    games: c.gameCount,
    inputs: c.inputsSha256,
    ts: Math.floor(Date.now() / 1000),
  });
}

export type PayoutLeg = {
  gameId: string;
  wallet: string;
  /** Share of the pool in basis points, as ranked. */
  shareBps: number;
  lamports: number;
};

/**
 * The payout receipt for a closed epoch.
 *
 * It names the commitment it settles against. A receipt that did not would be
 * a payout with no stated basis, which is the arrangement this product exists
 * to object to.
 *
 * The legs carry a game id, a share and an amount, but not a wallet. That is
 * not an omission for space, though space is tight: the recipient addresses
 * are the transfer instructions in this same transaction, where they are
 * enforced rather than merely asserted. Repeating them in the memo would
 * create a second copy that could disagree with the first, and a reader
 * comparing the two would have no way to know which one was the payment.
 */
export function encodeSettlement(
  epoch: number,
  inputsSha256: string,
  legs: PayoutLeg[],
  paid: boolean,
  part?: { index: number; of: number },
) {
  return JSON.stringify({
    p: "clearcade/v1",
    kind: "payout",
    epoch,
    against: inputsSha256.slice(0, 16),
    ...(part && part.of > 1 ? { part: [part.index, part.of] } : {}),
    legs: legs.map((l) => [l.gameId, l.shareBps, l.lamports]),
    ...(paid ? { paid_lamports_per_usd: DEVNET_LAMPORTS_PER_USD } : {}),
    ts: Math.floor(Date.now() / 1000),
  });
}

/**
 * How many payout legs fit in one transaction alongside their receipt.
 *
 * A legacy transaction caps at 1232 bytes. Each leg costs roughly 44 bytes of
 * transaction — a fresh account key plus the transfer instruction — and about
 * 33 bytes of receipt. Eight leaves comfortable headroom for the signature,
 * the blockhash and the memo's fixed fields.
 *
 * Splitting matters more than it looks. Each part carries its own receipt
 * naming the same commitment, so within any one signature the amounts claimed
 * and the amounts moved are still the same event. A design that wrote one
 * receipt and then paid in separate transactions would be claiming a link
 * between two things that could quietly come apart.
 */
export const LEGS_PER_TRANSACTION = 8;

export function chunkLegs(legs: PayoutLeg[], size = LEGS_PER_TRANSACTION): PayoutLeg[][] {
  const out: PayoutLeg[][] = [];
  for (let i = 0; i < legs.length; i += size) out.push(legs.slice(i, i + size));
  return out;
}

export function memoInstruction(payload: string, signer: PublicKey) {
  // TextEncoder rather than Buffer: this runs in the browser too, and Next
  // does not polyfill node globals into the client bundle.
  const bytes = new TextEncoder().encode(payload);

  if (bytes.length > MEMO_MAX_BYTES) {
    throw new Error(
      `This record is ${bytes.length} bytes and the memo program takes at most ${MEMO_MAX_BYTES}. Commit the epoch in two parts or shorten the table.`,
    );
  }

  return new TransactionInstruction({
    keys: [{ pubkey: signer, isSigner: true, isWritable: false }],
    programId: MEMO_PROGRAM_ID,
    data: bytes as unknown as Buffer,
  });
}

/**
 * Wallets among these that have never been funded.
 *
 * One round trip for the whole set. The public devnet endpoint rate limits,
 * and deciding what a sixteen-game epoch can pay should not cost sixteen
 * requests.
 */
export async function unfundedWallets(
  connection: Connection,
  wallets: string[],
): Promise<Set<string>> {
  const unique = [...new Set(wallets)];
  const infos = await connection.getMultipleAccountsInfo(
    unique.map((w) => new PublicKey(w)),
  );
  return new Set(unique.filter((_, i) => infos[i] === null));
}

/**
 * Transfers for a set of payout legs.
 *
 * Legs to one wallet are combined. A leg owed to the payer's own address is
 * returned as `internal`, because sending lamports to yourself moves nothing
 * and costs a fee. A leg to a wallet that does not exist yet and is too small
 * to open one comes back as `deferred` rather than being dropped, so the
 * caller reports it as still owed instead of shrinking the split in silence.
 */
export function payoutInstructions(
  legs: PayoutLeg[],
  from: PublicKey,
  unfunded: Set<string> = new Set(),
): {
  transfers: TransactionInstruction[];
  deferred: PayoutLeg[];
  internal: PayoutLeg[];
} {
  const payer = from.toBase58();
  const byWallet = new Map<string, number>();
  for (const leg of legs) {
    byWallet.set(leg.wallet, (byWallet.get(leg.wallet) ?? 0) + leg.lamports);
  }

  const transfers: TransactionInstruction[] = [];
  const deferred: PayoutLeg[] = [];
  const internal: PayoutLeg[] = [];
  const legsTo = (w: string) => legs.filter((l) => l.wallet === w);

  for (const [wallet, lamports] of byWallet) {
    if (wallet === payer) {
      internal.push(...legsTo(wallet));
      continue;
    }
    if (unfunded.has(wallet) && lamports < RENT_EXEMPT_FLOOR) {
      deferred.push(...legsTo(wallet));
      continue;
    }
    transfers.push(
      SystemProgram.transfer({
        fromPubkey: from,
        toPubkey: new PublicKey(wallet),
        lamports,
      }),
    );
  }

  return { transfers, deferred, internal };
}

export type ChainRecord = {
  signature: string;
  blockTime: number | null;
  record: Record<string, unknown>;
};

/**
 * Pull Clearcade records back off the chain from an address alone.
 *
 * This is the function that makes the rest of it checkable, so it takes an
 * address as an argument: a reviewer who does not hold our key runs it
 * against our public one and reads the same records we do.
 */
export async function readRecords(
  connection: Connection,
  address: PublicKey,
  limit = 25,
): Promise<ChainRecord[]> {
  const sigs = await connection.getSignaturesForAddress(address, { limit });
  const out: ChainRecord[] = [];

  // The public devnet endpoint rate limits a tight fetch loop and answers 429
  // rather than anything about our data. Space the calls out, and treat a
  // refusal as one unreadable record instead of letting it abort the read —
  // returning fewer records than exist is bad, but returning none because the
  // thirtieth was throttled is worse.
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  for (const [i, { signature, blockTime }] of sigs.entries()) {
    if (i > 0) await sleep(240);

    let tx;
    try {
      tx = await connection.getTransaction(signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });
    } catch {
      continue;
    }
    const log = (tx?.meta?.logMessages ?? []).find((l) => l.includes("Memo (len"));
    if (!log) continue;

    // The runtime log wraps the memo in a quoted, escaped string. Take the
    // inner JSON out whole rather than picking at fields with a regex.
    try {
      const record = JSON.parse(JSON.parse(log.slice(log.indexOf('"'))));
      // getSignaturesForAddress types blockTime as optional as well as
      // nullable; a missing one and a null one both mean the node has not
      // dated it yet, so they collapse to null here.
      if (record?.p === "clearcade/v1") {
        out.push({ signature, blockTime: blockTime ?? null, record });
      }
    } catch {
      continue;
    }
  }

  return out;
}

export const explorerTx = (sig: string) => `${EXPLORER}/tx/${sig}?cluster=devnet`;
export const explorerAddress = (a: string) => `${EXPLORER}/address/${a}?cluster=devnet`;

export type { Transaction };
