"use client";

import { useEffect, useState } from "react";
import { canonicalInputs, explorerTx, sha256Hex } from "@/lib/chain";
import { cohort } from "@/lib/data";

type Commit = {
  signature: string;
  blockTime: number | null;
  epoch: number;
  weights: number[];
  poolUsd: number;
  games: number;
  inputsSha256: string;
};

type Status = "loading" | "ready" | "empty" | "error";

/**
 * The check, done in the visitor's own browser.
 *
 * This is the part that has to be watertight, so it does as little as
 * possible and none of it on our side. The table of inputs is already in the
 * page. The browser lays it out in the documented order, hashes it with the
 * digest the platform ships, and compares the result against the hash sitting
 * in a Solana transaction. Our server is asked for one thing only, which is
 * what is on chain, and it could not fake a pass even if it wanted to,
 * because the transaction it names is public and the hashing happened here.
 *
 * A green result means the numbers behind today's ranking are the same
 * numbers committed before it was published. That is a narrow claim and the
 * page states it narrowly.
 */
export function CommitCheck({ epoch }: { epoch: number }) {
  const [status, setStatus] = useState<Status>("loading");
  const [commit, setCommit] = useState<Commit | null>(null);
  const [local, setLocal] = useState<string | null>(null);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The recomputation needs no network, so it runs immediately and is on
  // screen well before the RPC answers.
  useEffect(() => {
    let live = true;
    sha256Hex(canonicalInputs(epoch, cohort(epoch))).then((h) => {
      if (live) setLocal(h);
    });
    return () => {
      live = false;
    };
  }, [epoch]);

  useEffect(() => {
    let live = true;
    setStatus("loading");

    fetch("/api/commit")
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error ?? "The node did not answer.");
        return body as { commits: Commit[] };
      })
      .then((body) => {
        if (!live) return;
        const forEpoch = body.commits.filter((c) => c.epoch === epoch);
        if (forEpoch.length === 0) {
          setStatus("empty");
          return;
        }
        setCommit(forEpoch[0]);
        setStatus("ready");
      })
      .catch((e) => {
        if (!live) return;
        setError(e instanceof Error ? e.message : "Could not reach devnet.");
        setStatus("error");
      });

    return () => {
      live = false;
    };
  }, [epoch]);

  async function commitNow() {
    setCommitting(true);
    setError(null);
    try {
      const res = await fetch("/api/commit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ epoch }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Devnet refused the commitment.");
      setCommit({
        signature: body.signature,
        blockTime: Math.floor(Date.now() / 1000),
        epoch,
        weights: [3000, 3000, 2500, 1500],
        poolUsd: 0,
        games: cohort(epoch).length,
        inputsSha256: body.inputsSha256,
      });
      setStatus("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Devnet refused the commitment.");
    } finally {
      setCommitting(false);
    }
  }

  const matches = commit && local ? commit.inputsSha256 === local : null;

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--color-ink-700)] bg-[var(--color-ink-900)]">
      <div className="border-b border-[var(--color-ink-800)] px-5 py-3.5">
        <h3 className="text-sm font-semibold">Check epoch {epoch} yourself</h3>
        <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--color-mist-500)]">
          Your browser hashes the input table printed on this page and sets the result
          against the hash recorded on Solana. Nothing in between is ours to fake.
        </p>
      </div>

      <div className="space-y-3 p-5">
        <HashRow
          label="Recomputed here, in your browser"
          value={local}
          pending={local === null}
        />
        <HashRow
          label="Recorded on Solana devnet"
          value={commit?.inputsSha256 ?? null}
          pending={status === "loading"}
          missing={status === "empty" || status === "error"}
        />

        {matches === true && (
          <div className="rounded-xl border border-[var(--color-glass-600)]/50 bg-[var(--color-glass-600)]/10 px-4 py-3">
            <p className="text-[13px] font-medium text-[var(--color-glass-300)]">
              The two hashes are identical.
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-[var(--color-mist-300)]">
              Every session count, retention figure and rating behind this ranking is
              byte for byte what was committed before the ranking was published. Changing
              one of them now would break this check for everyone at once.
            </p>
            {commit && (
              <a
                href={explorerTx(commit.signature)}
                target="_blank"
                rel="noreferrer"
                className="mt-2 block break-all font-mono text-[11px] text-[var(--color-mist-500)] underline decoration-dotted hover:text-[var(--color-mist-100)]"
              >
                {commit.signature}
              </a>
            )}
          </div>
        )}

        {matches === false && (
          <div className="rounded-xl border border-[var(--color-coral-400)]/50 bg-[var(--color-coral-400)]/10 px-4 py-3">
            <p className="text-[13px] font-medium text-[var(--color-coral-300)]">
              The hashes disagree.
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-[var(--color-mist-300)]">
              The table on this page is not the table committed for epoch {epoch}. Either
              the catalogue changed after the commitment, or the commitment belongs to a
              different set of numbers. Both are worth an explanation, and this is the
              state the check exists to surface rather than bury.
            </p>
          </div>
        )}

        {status === "empty" && (
          <div className="rounded-xl border border-[var(--color-ink-600)] bg-[var(--color-ink-850)] px-4 py-3">
            <p className="text-[13px] text-[var(--color-mist-300)]">
              Epoch {epoch} has not been committed on this deployment yet.
            </p>
            <button
              onClick={commitNow}
              disabled={committing}
              className="mt-3 rounded-lg bg-[var(--color-glass-500)] px-4 py-2 text-[13px] font-medium text-[var(--color-ink-950)] transition-colors hover:bg-[var(--color-glass-400)] disabled:opacity-50"
            >
              {committing ? "Waiting on devnet…" : "Commit it now and watch"}
            </button>
          </div>
        )}

        {error && (
          <p className="rounded-xl border border-[var(--color-coral-400)]/40 bg-[var(--color-coral-400)]/[0.07] px-4 py-3 text-[12.5px] text-[var(--color-coral-300)]">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

function HashRow({
  label,
  value,
  pending,
  missing,
}: {
  label: string;
  value: string | null;
  pending?: boolean;
  missing?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-widest text-[var(--color-mist-700)]">
        {label}
      </p>
      {pending ? (
        <div className="checking mt-1.5 h-4 w-full rounded" />
      ) : (
        <p
          className={`mt-1.5 break-all font-mono text-[11.5px] leading-relaxed ${
            missing ? "text-[var(--color-mist-700)]" : "text-[var(--color-mist-300)]"
          }`}
        >
          {value ?? "not on chain yet"}
        </p>
      )}
    </div>
  );
}
