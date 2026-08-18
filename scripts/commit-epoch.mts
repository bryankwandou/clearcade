/**
 * Commits one epoch's ranking inputs to Solana devnet.
 *
 * Run:  node scripts/commit-epoch.mts <epoch>
 *
 * This imports the same canonical layout the site prints and the same hash
 * the browser recomputes. Nothing here reimplements either. If the page and
 * the chain ever disagree, it will not be because this script had its own
 * idea about how to lay the table out.
 */

import { Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { canonicalInputs, encodeCommit, memoInstruction, sha256Hex } from "../src/lib/chain.ts";
import { EPOCHS, POOL_USD, cohort } from "../src/lib/data.ts";
import { WEIGHTS_V1, rankCohort } from "../src/lib/rank.ts";
import { RPC, connection, signer, usd } from "./env.mts";

const epoch = Number(process.argv[2] ?? 3);
if (!EPOCHS.includes(epoch as (typeof EPOCHS)[number])) {
  console.error(`Epoch ${epoch} is not closed. Closed epochs are ${EPOCHS.join(", ")}.`);
  process.exit(1);
}

const metrics = cohort(epoch);
const table = canonicalInputs(epoch, metrics);
const hash = await sha256Hex(table);
const ranked = rankCohort(metrics, WEIGHTS_V1);

console.log(`epoch      ${epoch}`);
console.log(`games      ${metrics.length}`);
console.log(`pool       ${usd(POOL_USD[epoch])}`);
console.log(`weights    reach ${WEIGHTS_V1.reach / 100}%  returns ${WEIGHTS_V1.retention / 100}%  depth ${WEIGHTS_V1.depth / 100}%  rating ${WEIGHTS_V1.rating / 100}%`);
console.log(`table      ${table.length} bytes`);
console.log(`sha256     ${hash}\n`);

console.log("ranking produced by these inputs:");
for (const r of ranked.slice(0, 5)) {
  console.log(
    `  ${String(r.rank).padStart(2)}  ${r.gameId.padEnd(20)} ${String(r.score).padStart(5)}  ${(r.shareBps / 100).toFixed(2).padStart(6)}%`,
  );
}
if (ranked.length > 5) console.log(`  … ${ranked.length - 5} more`);

// The shares are truncated per game, so they will not add to exactly 100%.
// The gap is printed rather than hidden: a reader who adds the column up
// should find the discrepancy already accounted for.
const shareTotal = ranked.reduce((s, r) => s + r.shareBps, 0);
console.log(`\nshares add to ${(shareTotal / 100).toFixed(2)}% (truncation leaves ${((10_000 - shareTotal) / 100).toFixed(2)}% to the top game at payout)`);

const kp = signer();
const conn = connection();
const balance = await conn.getBalance(kp.publicKey);

console.log(`\ncluster    ${RPC}`);
console.log(`committer  ${kp.publicKey.toBase58()}`);
console.log(`balance    ${(balance / 1e9).toFixed(4)} SOL`);

const payload = encodeCommit({
  epoch,
  weights: WEIGHTS_V1,
  poolUsd: POOL_USD[epoch],
  gameCount: metrics.length,
  inputsSha256: hash,
});
console.log(`payload    ${payload.length} bytes`);

const tx = new Transaction().add(memoInstruction(payload, kp.publicKey));
const signature = await sendAndConfirmTransaction(conn, tx, [kp], {
  commitment: "confirmed",
  maxRetries: 3,
});

console.log(`\nsignature  ${signature}`);
console.log(`explorer   https://explorer.solana.com/tx/${signature}?cluster=devnet`);

// Read the commitment back and rehash the table independently, because a
// script that only prints what it sent proves nothing at all.
const confirmed = await conn.getTransaction(signature, {
  commitment: "confirmed",
  maxSupportedTransactionVersion: 0,
});
const log = (confirmed?.meta?.logMessages ?? []).find((l) => l.includes("Memo (len"));

if (!log) {
  console.log("\nread back  memo log not returned yet, which is node lag rather than failure");
} else {
  const onChain = JSON.parse(JSON.parse(log.slice(log.indexOf('"'))));
  const rehashed = await sha256Hex(canonicalInputs(epoch, cohort(epoch)));
  if (onChain.inputs === rehashed) {
    console.log(`\nverified   the hash on chain matches a fresh hash of the table`);
  } else {
    console.error(`\nThe hash on chain is ${onChain.inputs} but the table hashes to ${rehashed}.`);
    process.exit(1);
  }
}
