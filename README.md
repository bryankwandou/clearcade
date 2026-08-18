# Clearcade

A catalogue of player-made games where the ranking that decides who gets seen is
published in full, committed to Solana before it goes out, and recomputable by
anyone who wants to check it.

Live: https://clearcade.vercel.app
Cluster: Solana devnet

## The problem this is aimed at

On the platforms creators actually use, discovery is a black box. A game's
position in the catalogue determines almost all of its traffic, and therefore
almost all of its income, and nobody outside the company can say why any
particular game sits where it does. Creators are left reading forum rumours
about what the algorithm rewards this month. When earnings fall, there is no way
to distinguish a game getting worse from a rule quietly changing.

Three consequences follow, and all three are things creators complain about
constantly:

- A long-session game and a slot-machine game are scored against each other on
  terms nobody published.
- Testing with real players early depresses the retention figures that follow
  the game forever.
- Payouts arrive with an earnings floor and a country list, both of which the
  platform can move without telling anyone.

## What Clearcade does instead

The ranking rule is four numbers and a page of arithmetic. Every input that
feeds it is published as a table. Before the ranking for an epoch is released,
Clearcade writes a SHA-256 of that exact table to Solana. When the payout goes
out, its receipt names the commitment it settles against, and the transfers ride
in the same transaction as the receipt.

That leaves three possibilities and no fourth. Publish honest numbers. Publish
false numbers in the open, where a creator holding their own analytics can
contradict them. Or edit the numbers afterwards and fail the hash check for
every visitor at once.

A database timestamp would establish none of this, because the operator owns the
database. The ordering has to come from somewhere the operator cannot reach.

## The rule

Score is a weighted sum of four components, each in basis points, each an
integer. Weights sum to 10,000.

| Component | Weight | What it measures |
|-----------|--------|------------------|
| Reach     | 30%    | Sessions, on a saturation curve — 25,000 sessions is worth half marks, and the curve never tops out |
| Retention | 30%    | Returning players over total players |
| Depth     | 25%    | Median session length against a 30-minute cap |
| Rating    | 15%    | Player rating, carried straight through |

Every division truncates. No floating point anywhere in the scoring path. Two
machines running this get identical output, which is the only reason the hash
check is worth anything.

Read the full specification, with a worked example and the honest limits, at
[/rule](https://clearcade.vercel.app/rule).

## Verifying it yourself

You need no keys of ours to check any of this.

```bash
npm install
node scripts/audit.mts <committer-address> 25
```

The audit does two things. For every commitment, it rehashes the current input
table and compares against what is on chain — a pass means those numbers have
not been edited since. For every payout, it compares the lamports the receipt
claims against the balance changes the transaction actually recorded. A receipt
is a claim; the ledger deltas are not.

It exits non-zero on any mismatch, so it works in CI.

## Running the pipeline

```bash
cp .env.example .env.local        # add a devnet key
node scripts/commit-epoch.mts 3   # hash the inputs, write the commitment
node scripts/fund-wallets.mts     # open creator wallets (once, idempotent)
node scripts/settle-epoch.mts 3   # record what is owed
node scripts/settle-epoch.mts 3 --pay   # move the lamports
node scripts/audit.mts            # check the lot
```

`settle-epoch` refuses to pay if the catalogue no longer hashes to what was
committed. Paying against numbers nobody committed to is the exact failure this
design exists to rule out, so the script treats it as fatal rather than a
warning.

A legacy transaction caps at 1232 bytes, which is not enough for sixteen
transfers plus a receipt describing them. Settlement therefore splits into
parts, each pairing its own receipt with its own transfers under one signature.
The guarantee survives the split: no part ever claims a payment that is not in
the same transaction.

## Pages

| Path | What is there |
|------|---------------|
| `/` | The argument, and a weight editor that reorders the catalogue live |
| `/rule` | The specification, a worked example, the canonical table, and a live hash check |
| `/catalogue` | All games, filterable and sortable |
| `/game/[id]` | One game's component breakdown, and what its weakest component is costing |
| `/studio` | A creator's side: what they earned, per epoch, per game |
| `/ledger` | Every Clearcade record on devnet, read back from the chain |

## Stack

Next.js 16, React 19, Tailwind 4, `@solana/web3.js` against the SPL Memo
program. No custom on-chain program: the claim being made is about commitment
ordering and payment atomicity, both of which the memo program and the system
program already provide. Deploying a program to restate that would add an
upgrade authority — one more thing a creator would have to trust.

## Honest limits

The commitment proves the inputs were fixed before the ranking published. It
does not prove the inputs are true. Sessions can be manufactured. Weights can
still change between epochs, and the only defence offered is that a change is
visible in the commitment rather than hidden.

Payout figures on devnet are scaled — the factor is written into every receipt,
because a transfer that looks like a payment and is not one is worse than no
transfer at all.

The catalogue is sample data, and every page that shows a number says so.
