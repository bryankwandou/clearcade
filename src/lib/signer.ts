import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { cleanEnv } from "./chain";

/**
 * The key the deployment signs commitments with.
 *
 * Server side only. A visitor without a wallet should still be able to watch
 * a real epoch get committed to a real chain, and that requires somebody to
 * pay the fee. Accepts either a base58 secret or a JSON byte array, because
 * the Solana CLI hands out the second and every wallet exports the first.
 */
export function demoSigner(): Keypair | null {
  const secret = cleanEnv(process.env.SOLANA_DEMO_SECRET);
  if (!secret) return null;
  try {
    return secret.startsWith("[")
      ? Keypair.fromSecretKey(Uint8Array.from(JSON.parse(secret)))
      : Keypair.fromSecretKey(bs58.decode(secret));
  } catch {
    return null;
  }
}
