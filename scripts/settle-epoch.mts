/**
 * Pays an epoch out along the ranking that was committed for it.
 *
 * Run:  node scripts/settle-epoch.mts <epoch> [--pay]
 *
 * Without --pay the transaction records what each creator is owed. With it,
 * the same transaction moves devnet lamports to every creator wallet, so the
 * receipt and the payment share one signature and cannot drift apart.
 *
 * The split is recomputed here from the catalogue and then checked against
 * the hash already on chain. If the two disagree the script refuses to pay,
 * because a payout that does not match its own commitment is the failure this
 * whole design exists to prevent.
 */

import {
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  DEVNET_LAMPORTS_PER_USD,
  LEGS_PER_TRANSACTION,
  RENT_EXEMPT_FLOOR,
  canonicalInputs,
  chunkLegs,
  encodeSettlement,
  memoInstruction,
  payoutInstructions,
  readRecords,
  sha256Hex,
  unfundedWallets,
  type PayoutLeg,
} from "../src/lib/chain.ts";
import { EPOCHS, INDEX, POOL_USD, cohort } from "../src/lib/data.ts";
import { BPS, WEIGHTS_V1, rankCohort, splitPool } from "../src/lib/rank.ts";
import { RPC, connection, signer, usd } from "./env.mts";

const pay = process.argv.includes("--pay");
const argv = process.argv.slice(2).filter((a) => a !== "--pay");
const epoch = Number(argv[0] ?? 3);

if (!EPOCHS.includes(epoch as (typeof EPOCHS)[number])) {
  console.error(`Epoch ${epoch} is not closed. Closed epochs are ${EPOCHS.join(", ")}.`);
  process.exit(1);
}

const metrics = cohort(epoch);
const ranked = rankCohort(metrics, WEIGHTS_V1);
const hash = await sha256Hex(canonicalInputs(epoch, metrics));

const poolUsd = POOL_USD[epoch];
const poolLamports = poolUsd * DEVNET_LAMPORTS_PER_USD;
const { payouts, remainder } = splitPool(ranked, poolLamports);

const kp = signer();
const conn = connection();

console.log(`epoch      ${epoch}`);
console.log(`games      ${ranked.length}`);
console.log(`pool       ${usd(poolUsd)}  (${poolLamports.toLocaleString("en-US")} lamports at ${DEVNET_LAMPORTS_PER_USD} per dollar)`);
console.log(`sha256     ${hash}`);

// The commitment has to exist and has to match before any money moves.
const records = await readRecords(conn, kp.publicKey, 40);
const commit = records.find(
  (r) => r.record.kind === "commit" && Number(r.record.epoch) === epoch,
);

if (!commit) {
  console.error(`\nEpoch ${epoch} has no commitment on chain. Run commit-epoch.mts first — paying before committing would let the numbers be chosen after the fact, which is the arrangement this is built to rule out.`);
  process.exit(1);
}

if (String(commit.record.inputs) !== hash) {
  console.error(`\nThe committed hash is ${commit.record.inputs} but the catalogue now hashes to ${hash}.`);
  console.error(`The inputs changed after the commitment. Refusing to pay against numbers nobody committed to.`);
  process.exit(1);
}

console.log(`commitment ${commit.signature}`);
console.log(`           matches the current table\n`);

const legs: PayoutLeg[] = ranked.map((r) => {
  const game = INDEX.get(r.gameId)!;
  return {
    gameId: r.gameId,
    wallet: game.creatorWallet,
    shareBps: r.shareBps,
    lamports: payouts.get(r.gameId) ?? 0,
  };
});

for (const leg of legs.slice(0, 8)) {
  const game = INDEX.get(leg.gameId)!;
  console.log(
    `  ${String(ranked.find((r) => r.gameId === leg.gameId)!.rank).padStart(2)}  ${game.title.padEnd(24)} ${(leg.shareBps / 100).toFixed(2).padStart(6)}%  ${String(leg.lamports).padStart(9)} lamports  ${usd(leg.lamports / DEVNET_LAMPORTS_PER_USD)}`,
  );
}
if (legs.length > 8) console.log(`  … ${legs.length - 8} more`);

const hedged = legs.reduce((s, l) => s + l.lamports, 0);
console.log(`\nlegs total ${hedged.toLocaleString("en-US")} lamports against a pool of ${poolLamports.toLocaleString("en-US")}`);
if (hedged !== poolLamports) {
  console.error("The legs do not add up to the pool. Refusing to sign.");
  process.exit(1);
}
console.log(`           truncation remainder of ${remainder} lamports went to the top-ranked game`);

const balance = await conn.getBalance(kp.publicKey);
console.log(`\ncluster    ${RPC}`);
console.log(`signer     ${kp.publicKey.toBase58()}`);
console.log(`balance    ${(balance / 1e9).toFixed(4)} SOL`);

let settled = false;

if (pay) {
  // Legs are checked against the chain before the receipt is written, and the
  // receipt is then built from the instructions the transaction will actually
  // carry. Stamping "paid" from the command line flag and assembling the
  // transfers afterwards is how a receipt ends up claiming payments that
  // never happened.
  const missing = await unfundedWallets(conn, legs.map((l) => l.wallet));
  const built = payoutInstructions(legs, kp.publicKey, missing);

  if (built.deferred.length > 0) {
    console.error(`\n${built.deferred.length} creator wallet(s) have never been funded and cannot be opened with less than ${RENT_EXEMPT_FLOOR} lamports:`);
    for (const leg of built.deferred) console.error(`  ${leg.wallet}  ${INDEX.get(leg.gameId)?.creator}`);
    console.error(`\nOpen them first:  node scripts/fund-wallets.mts`);
    process.exit(1);
  }

  const moving = legs
    .filter((l) => !built.internal.includes(l))
    .reduce((s, l) => s + l.lamports, 0);

  if (balance < moving + 200_000) {
    console.error(`\nSigner holds ${(balance / 1e9).toFixed(4)} SOL and this settlement moves ${(moving / 1e9).toFixed(4)} SOL.`);
    console.error(`solana airdrop 2 ${kp.publicKey.toBase58()} --url devnet`);
    process.exit(1);
  }

  settled = true;
  console.log(`paying     ${built.transfers.length} wallet(s), ${(moving / 1e9).toFixed(6)} SOL`);
}

// One transaction cannot hold sixteen transfers and a receipt describing them,
// so the epoch settles in parts. Each part pairs its own receipt with its own
// transfers under one signature, which keeps the guarantee that matters: no
// part ever claims a payment that is not in the same transaction.
const parts = chunkLegs(legs);
console.log(`parts      ${parts.length} transaction(s), up to ${LEGS_PER_TRANSACTION} legs each`);

const signatures: string[] = [];

for (const [i, part] of parts.entries()) {
  const payload = encodeSettlement(epoch, hash, part, settled, {
    index: i + 1,
    of: parts.length,
  });

  const tx = new Transaction().add(memoInstruction(payload, kp.publicKey));

  if (settled) {
    const missing = await unfundedWallets(conn, part.map((l) => l.wallet));
    const built = payoutInstructions(part, kp.publicKey, missing);
    for (const t of built.transfers) tx.add(t);
  }

  const signature = await sendAndConfirmTransaction(conn, tx, [kp], {
    commitment: "confirmed",
    maxRetries: 3,
  });
  signatures.push(signature);

  console.log(
    `\npart ${i + 1}/${parts.length}  ${part.length} legs, ${payload.length} byte receipt`,
  );
  console.log(`  https://explorer.solana.com/tx/${signature}?cluster=devnet`);
}

console.log(`\nAll ${parts.length} part(s) settle against commitment ${hash.slice(0, 16)},`);
console.log(`which is on chain at ${commit.signature}`);

void BPS;
