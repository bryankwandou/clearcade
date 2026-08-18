/**
 * Audits every Clearcade record on chain against what the catalogue says now.
 *
 * Run:  node scripts/audit.mts [address] [limit]
 *
 * This is the script a sceptic runs. It takes an address, so it can be
 * pointed at our deployment by somebody who holds none of our keys, and it
 * checks two things that Clearcade cannot talk its way out of.
 *
 * For each commitment: rehash the current input table and compare. A pass
 * means the numbers behind that epoch's ranking have not been edited since.
 *
 * For each payout: compare the lamports the receipt claims against the
 * balance changes the transaction actually recorded. A receipt is a claim;
 * the deltas are not. Where they disagree the receipt is wrong, and saying so
 * loudly is the entire job.
 */

import { Connection, PublicKey } from "@solana/web3.js";
import {
  DEVNET_LAMPORTS_PER_USD,
  canonicalInputs,
  readRecords,
  sha256Hex,
} from "../src/lib/chain.ts";
import { INDEX, cohort } from "../src/lib/data.ts";
import { RPC, connection, signer } from "./env.mts";

const argAddress = process.argv[2] && process.argv[2].length > 30 ? process.argv[2] : null;
const limit = Number(process.argv[argAddress ? 3 : 2] ?? 25);

const address = argAddress ? new PublicKey(argAddress) : signer().publicKey;
const conn = connection();

console.log(`cluster    ${RPC}`);
console.log(`auditing   ${address.toBase58()}\n`);

const records = await readRecords(conn, address, Number.isFinite(limit) ? limit : 25);
console.log(`found      ${records.length} clearcade records\n`);

let commitsChecked = 0;
let commitsMatched = 0;
let payoutsChecked = 0;
let payoutMismatches = 0;
let lamportsMoved = 0;

/** Balance change per account in one transaction, from its own metadata. */
async function deltas(signature: string) {
  const tx = await conn.getTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });
  if (!tx) return null;

  const keys = tx.transaction.message.getAccountKeys({
    accountKeysFromLookups: tx.meta?.loadedAddresses,
  });
  const out = new Map<string, number>();
  const pre = tx.meta?.preBalances ?? [];
  const post = tx.meta?.postBalances ?? [];
  for (let i = 0; i < pre.length; i += 1) {
    const key = keys.get(i);
    if (key) out.set(key.toBase58(), (post[i] ?? 0) - pre[i]);
  }
  return { deltas: out, payer: keys.get(0)?.toBase58() };
}

for (const r of records) {
  const when = r.blockTime
    ? new Date(r.blockTime * 1000).toISOString().slice(0, 16).replace("T", " ")
    : "pending";
  const rec = r.record as Record<string, unknown>;

  if (rec.kind === "commit") {
    commitsChecked += 1;
    const epoch = Number(rec.epoch);
    const rehashed = await sha256Hex(canonicalInputs(epoch, cohort(epoch)));
    const ok = rehashed === String(rec.inputs);
    if (ok) commitsMatched += 1;

    console.log(`[commit]  ${when}  epoch ${epoch}, ${rec.games} games, pool $${Number(rec.pool_usd).toLocaleString("en-US")}`);
    console.log(`          weights ${(rec.w as number[]).map((x) => `${x / 100}%`).join(" ")}`);
    console.log(`          on chain  ${rec.inputs}`);
    console.log(`          rehashed  ${rehashed}`);
    console.log(
      ok
        ? `          the inputs behind epoch ${epoch} are unchanged since they were committed`
        : `          MISMATCH: the catalogue no longer hashes to what was committed`,
    );
  } else if (rec.kind === "payout") {
    payoutsChecked += 1;
    const legs = (rec.legs ?? []) as [string, number, number][];
    const part = rec.part as [number, number] | undefined;
    const scale = Number(rec.paid_lamports_per_usd) || 0;

    console.log(
      `[payout]  ${when}  epoch ${rec.epoch}${part ? `, part ${part[0]} of ${part[1]}` : ""}, ${legs.length} legs, against ${rec.against}`,
    );

    if (!scale) {
      console.log(`          recorded as owed, no transfer claimed`);
    } else {
      const info = await deltas(r.signature);
      if (!info) {
        console.log(`          transaction not returned by the node, cannot check`);
      } else {
        // Several legs can name one wallet, so claims are summed per wallet
        // before being set against the single delta the ledger recorded.
        const claimed = new Map<string, number>();
        for (const [gameId, , lamports] of legs) {
          const wallet = INDEX.get(gameId)?.creatorWallet;
          if (!wallet) continue;
          claimed.set(wallet, (claimed.get(wallet) ?? 0) + lamports);
        }

        let bad = 0;
        for (const [wallet, lamports] of claimed) {
          if (wallet === info.payer) {
            console.log(`          ${wallet.slice(0, 8)}… is the paying account, ${lamports} stays put`);
            continue;
          }
          const actual = info.deltas.get(wallet) ?? 0;
          lamportsMoved += actual;
          if (actual !== lamports) {
            bad += 1;
            payoutMismatches += 1;
            console.log(`          MISMATCH ${wallet.slice(0, 8)}… receipt says ${lamports}, ledger moved ${actual}`);
          }
        }
        const total = [...claimed.values()].reduce((a, b) => a + b, 0);
        console.log(
          bad === 0
            ? `          all ${claimed.size} transfers match the receipt, ${total.toLocaleString("en-US")} lamports (${(total / DEVNET_LAMPORTS_PER_USD).toLocaleString("en-US", { maximumFractionDigits: 0 })} dollars at the stated scale)`
            : `          ${bad} transfer(s) disagree with the receipt`,
        );
      }
    }
  }
  console.log(`          ${r.signature}\n`);
}

console.log("─────");
console.log(`commitments   ${commitsMatched} of ${commitsChecked} still hash to the current catalogue`);
console.log(`payouts       ${payoutsChecked} checked, ${payoutMismatches} disagreement(s) with the ledger`);
console.log(`lamports      ${lamportsMoved.toLocaleString("en-US")} verified as actually moved`);

if (commitsChecked === 0 && payoutsChecked === 0) {
  console.error("\nNo Clearcade records at this address.");
  process.exit(1);
}

// A non-zero exit makes this usable in CI, where the interesting event is a
// commitment that stopped matching rather than a script that ran.
if (commitsMatched !== commitsChecked || payoutMismatches > 0) {
  console.error("\nAudit failed.");
  process.exit(1);
}
console.log("\nAudit passed.");
