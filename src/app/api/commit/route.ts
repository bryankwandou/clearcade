import { NextResponse } from "next/server";
import { Connection, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import {
  RPC,
  canonicalInputs,
  encodeCommit,
  memoInstruction,
  readRecords,
  sha256Hex,
} from "@/lib/chain";
import { cohort, EPOCHS, POOL_USD } from "@/lib/data";
import { WEIGHTS_V1 } from "@/lib/rank";
import { demoSigner } from "@/lib/signer";

export const dynamic = "force-dynamic";

/**
 * Commitments already on chain, newest first per epoch.
 *
 * The page that checks a hash calls this, then recomputes the hash locally
 * from the published table and compares. Deliberately the whole record rather
 * than a yes-or-no answer: a verification endpoint that returned "valid"
 * would just be asking you to trust a different endpoint.
 */
export async function GET() {
  const signer = demoSigner();
  if (!signer) {
    return NextResponse.json(
      { error: "This deployment has no devnet key configured, so it cannot show its own commitments." },
      { status: 503 },
    );
  }

  try {
    const connection = new Connection(RPC, "confirmed");
    const records = await readRecords(connection, signer.publicKey, 40);

    const commits = records
      .filter((r) => r.record.kind === "commit")
      .map((r) => ({
        signature: r.signature,
        blockTime: r.blockTime,
        epoch: Number(r.record.epoch),
        weights: r.record.w as number[],
        poolUsd: Number(r.record.pool_usd),
        games: Number(r.record.games),
        inputsSha256: String(r.record.inputs),
      }));

    return NextResponse.json({
      cluster: RPC,
      committer: signer.publicKey.toBase58(),
      commits,
    });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "The devnet node did not answer in time.",
      },
      { status: 502 },
    );
  }
}

/**
 * Commit one epoch's inputs.
 *
 * The hash is computed here from the catalogue this deployment is actually
 * serving, never from anything in the request body. A commitment endpoint
 * that hashed a caller-supplied table would let anyone stamp any numbers with
 * our key, which is the one thing it must not do.
 */
export async function POST(req: Request) {
  const signer = demoSigner();
  if (!signer) {
    return NextResponse.json(
      { error: "This deployment has no devnet key configured." },
      { status: 503 },
    );
  }

  let epoch: number;
  try {
    const body = (await req.json()) as { epoch?: unknown };
    epoch = Number(body.epoch);
  } catch {
    return NextResponse.json({ error: "Send a JSON body with an epoch." }, { status: 400 });
  }

  if (!EPOCHS.includes(epoch as (typeof EPOCHS)[number])) {
    return NextResponse.json(
      { error: `Epoch ${epoch} is not a closed epoch. Closed epochs are ${EPOCHS.join(", ")}.` },
      { status: 400 },
    );
  }

  const metrics = cohort(epoch);
  const table = canonicalInputs(epoch, metrics);
  const inputsSha256 = await sha256Hex(table);

  const payload = encodeCommit({
    epoch,
    weights: WEIGHTS_V1,
    poolUsd: POOL_USD[epoch],
    gameCount: metrics.length,
    inputsSha256,
  });

  try {
    const connection = new Connection(RPC, "confirmed");
    const tx = new Transaction().add(memoInstruction(payload, signer.publicKey));
    const signature = await sendAndConfirmTransaction(connection, tx, [signer], {
      commitment: "confirmed",
      maxRetries: 3,
    });

    return NextResponse.json({
      signature,
      cluster: RPC,
      committer: signer.publicKey.toBase58(),
      epoch,
      inputsSha256,
      payload,
    });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Devnet did not confirm the commitment. Try again shortly.",
      },
      { status: 502 },
    );
  }
}
