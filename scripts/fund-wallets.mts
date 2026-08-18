/**
 * Opens every creator wallet on devnet, once.
 *
 * Run:  node scripts/fund-wallets.mts [--dry]
 *
 * Solana refuses to create a system account holding less than the rent-exempt
 * minimum, and most payout legs here are far smaller than that. So the
 * accounts are opened with exactly the minimum and settlement afterwards
 * moves whatever the split says, however small. Real payment rails work the
 * same way: the recipient has to exist before they can be sent a cent.
 *
 * Idempotent. Wallets that already exist are left alone.
 */

import {
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { RENT_EXEMPT_FLOOR, unfundedWallets } from "../src/lib/chain.ts";
import { GAMES } from "../src/lib/data.ts";
import { RPC, connection, signer } from "./env.mts";

const dry = process.argv.includes("--dry");
const kp = signer();
const conn = connection();

const wallets = [...new Set(GAMES.map((g) => g.creatorWallet))];
const missing = await unfundedWallets(conn, wallets);

console.log(`cluster    ${RPC}`);
console.log(`signer     ${kp.publicKey.toBase58()}`);
console.log(`catalogue  ${wallets.length} distinct creator wallets`);
console.log(`unfunded   ${missing.size}`);

if (missing.size === 0) {
  console.log("\nEvery creator wallet exists. Payouts can land at any size.");
  process.exit(0);
}

const cost = missing.size * RENT_EXEMPT_FLOOR;
console.log(`cost       ${(cost / 1e9).toFixed(6)} SOL at ${RENT_EXEMPT_FLOOR} lamports each\n`);

for (const wallet of missing) {
  const owner = GAMES.find((g) => g.creatorWallet === wallet);
  console.log(`  ${wallet}  ${owner?.creator ?? "unknown"}`);
}

if (dry) {
  console.log("\n--dry, nothing sent.");
  process.exit(0);
}

const balance = await conn.getBalance(kp.publicKey);
if (balance < cost + 200_000) {
  console.error(`\nSigner holds ${(balance / 1e9).toFixed(4)} SOL, seeding needs ${(cost / 1e9).toFixed(4)} plus fees.`);
  console.error(`solana airdrop 2 ${kp.publicKey.toBase58()} --url devnet`);
  process.exit(1);
}

// Twelve account creations per transaction stays well inside the legacy size
// limit once the signature and header are counted.
const batches: string[][] = [];
for (const wallet of missing) {
  if (batches.length === 0 || batches[batches.length - 1].length === 12) batches.push([]);
  batches[batches.length - 1].push(wallet);
}

for (const [i, batch] of batches.entries()) {
  const tx = new Transaction();
  for (const wallet of batch) {
    tx.add(
      SystemProgram.transfer({
        fromPubkey: kp.publicKey,
        toPubkey: new PublicKey(wallet),
        lamports: RENT_EXEMPT_FLOOR,
      }),
    );
  }
  const signature = await sendAndConfirmTransaction(conn, tx, [kp], {
    commitment: "confirmed",
    maxRetries: 3,
  });
  console.log(`\nbatch ${i + 1}/${batches.length}  ${batch.length} accounts opened`);
  console.log(`  https://explorer.solana.com/tx/${signature}?cluster=devnet`);
}

const still = await unfundedWallets(conn, wallets);
if (still.size > 0) {
  console.error(`\n${still.size} wallet(s) still do not exist. Rerun.`);
  process.exit(1);
}
console.log("\nAll creator wallets exist. Payouts are unblocked at any size.");
