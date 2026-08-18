import { Section } from "../page";
import { LedgerFeed } from "@/components/ledger-feed";

export const metadata = {
  title: "Ledger — Clearcade",
  description:
    "Every epoch commitment and payout this deployment has written to Solana devnet, read back off the public chain.",
};

export default function LedgerPage() {
  return (
    <main className="pb-10">
      <Section
        eyebrow="On chain"
        title="Everything written, read back off the chain"
        lede="Not a log of what we say we did. These records are fetched from a public Solana node by address, and the address is printed below so the same query runs without us."
      >
        <LedgerFeed />
      </Section>
    </main>
  );
}
