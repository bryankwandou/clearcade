"use client";

import { useEffect, useState } from "react";
import { DEVNET_LAMPORTS_PER_USD, explorerTx } from "@/lib/chain";
import { INDEX } from "@/lib/data";

type Record = {
  signature: string;
  blockTime: number | null;
  record: {
    kind?: string;
    epoch?: number;
    w?: number[];
    pool_usd?: number;
    games?: number;
    inputs?: string;
    against?: string;
    legs?: [string, string, number, number][];
    paid_lamports_per_usd?: number;
  };
};

/**
 * Everything this deployment has written, pulled back off the chain.
 *
 * It reads from the public RPC rather than from anything we store, which is
 * the point: a ledger served out of our own database would be a list of
 * things we say we did. The address is printed at the top so anyone can run
 * the same query themselves and compare.
 */
export function LedgerFeed() {
  const [records, setRecords] = useState<Record[] | null>(null);
  const [meta, setMeta] = useState<{ committer: string; cluster: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetch("/api/ledger")
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error ?? "The node did not answer.");
        return body;
      })
      .then((body) => {
        if (!live) return;
        setRecords(body.records);
        setMeta({ committer: body.committer, cluster: body.cluster });
      })
      .catch((e) => live && setError(e instanceof Error ? e.message : "Could not reach devnet."));
    return () => {
      live = false;
    };
  }, []);

  if (error) {
    return (
      <p className="rounded-2xl border border-[var(--color-coral-400)]/40 bg-[var(--color-coral-400)]/[0.07] p-5 text-[13px] text-[var(--color-coral-300)]">
        {error}
      </p>
    );
  }

  if (!records) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="checking h-20 rounded-2xl opacity-40" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {meta && (
        <p className="mb-4 break-all font-mono text-[11.5px] text-[var(--color-mist-700)]">
          Reading {meta.committer} on {meta.cluster}
        </p>
      )}

      {records.length === 0 ? (
        <p className="rounded-2xl border border-[var(--color-ink-700)] bg-[var(--color-ink-900)] p-5 text-[13px] text-[var(--color-mist-500)]">
          Nothing has been written to devnet from this deployment yet. Commit an epoch on
          the rule page and it will appear here.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {records.map((r) => (
            <li
              key={r.signature}
              className="rounded-2xl border border-[var(--color-ink-700)] bg-[var(--color-ink-900)] p-5"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-2.5">
                  <span
                    className={`rounded-md px-2 py-0.5 font-mono text-[11px] ${
                      r.record.kind === "commit"
                        ? "bg-[var(--color-glass-600)]/20 text-[var(--color-glass-300)]"
                        : "bg-[var(--color-amber-500)]/20 text-[var(--color-amber-300)]"
                    }`}
                  >
                    {r.record.kind === "commit" ? "commitment" : "payout"}
                  </span>
                  <span className="text-[13.5px]">Epoch {r.record.epoch}</span>
                </div>
                <span className="font-mono text-[11.5px] text-[var(--color-mist-700)]">
                  {r.blockTime
                    ? new Date(r.blockTime * 1000).toISOString().slice(0, 16).replace("T", " ")
                    : "pending"}
                </span>
              </div>

              {r.record.kind === "commit" ? (
                <div className="mt-3 space-y-1.5 text-[12.5px] text-[var(--color-mist-500)]">
                  <p>
                    {r.record.games} games, pool $
                    {(r.record.pool_usd ?? 0).toLocaleString("en-US")}, weights{" "}
                    {(r.record.w ?? []).map((x) => `${x / 100}%`).join(" · ")}
                  </p>
                  <p className="break-all font-mono text-[11.5px] text-[var(--color-mist-300)]">
                    {r.record.inputs}
                  </p>
                </div>
              ) : (
                <div className="mt-3">
                  <p className="text-[12.5px] text-[var(--color-mist-500)]">
                    Settles against commitment {r.record.against}
                    {r.record.paid_lamports_per_usd
                      ? `, moved at ${r.record.paid_lamports_per_usd} lamports per dollar`
                      : ", recorded as owed with no transfer"}
                  </p>
                  <ul className="mt-2.5 space-y-1">
                    {(r.record.legs ?? []).map(([gameId, wallet, shareBps, lamports]) => (
                      <li
                        key={gameId}
                        className="flex items-baseline justify-between gap-3 text-[12px]"
                      >
                        <span className="truncate text-[var(--color-mist-300)]">
                          {INDEX.get(gameId)?.title ?? gameId}
                        </span>
                        <span className="shrink-0 font-mono text-[var(--color-mist-500)] tnum">
                          {(shareBps / 100).toFixed(2)}% · {lamports.toLocaleString("en-US")}{" "}
                          lamports
                          <span className="ml-2 text-[var(--color-amber-400)]">
                            ${Math.round(lamports / DEVNET_LAMPORTS_PER_USD).toLocaleString("en-US")}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <a
                href={explorerTx(r.signature)}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block break-all font-mono text-[11px] text-[var(--color-mist-700)] underline decoration-dotted hover:text-[var(--color-mist-300)]"
              >
                {r.signature}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
