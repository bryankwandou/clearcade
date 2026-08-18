import { NextResponse } from "next/server";
import { Connection } from "@solana/web3.js";
import { RPC, readRecords } from "@/lib/chain";
import { demoSigner } from "@/lib/signer";

export const dynamic = "force-dynamic";

/**
 * Every Clearcade record at this deployment's address.
 *
 * A thin pass-through to the public RPC. It exists because a browser calling
 * a devnet node directly hits rate limits and CORS on some endpoints, not
 * because anything here is privileged — the address is printed alongside the
 * results so the same query can be run without us.
 */
export async function GET() {
  const signer = demoSigner();
  if (!signer) {
    return NextResponse.json(
      { error: "This deployment has no devnet key configured, so it has no records to show." },
      { status: 503 },
    );
  }

  try {
    const connection = new Connection(RPC, "confirmed");
    const records = await readRecords(connection, signer.publicKey, 30);
    return NextResponse.json({
      cluster: RPC,
      committer: signer.publicKey.toBase58(),
      records,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "The devnet node did not answer in time." },
      { status: 502 },
    );
  }
}
