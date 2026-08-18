"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Thumb } from "@/components/thumb";
import { CATEGORIES, INDEX, cohort, type Category } from "@/lib/data";
import { WEIGHTS_V1, rankCohort, BPS } from "@/lib/rank";

type Sort = "rank" | "depth" | "returning" | "newest";

const SORTS: { key: Sort; label: string; note: string }[] = [
  { key: "rank", label: "Catalogue order", note: "The published rule, unaltered" },
  { key: "depth", label: "Longest sessions", note: "Median session length" },
  { key: "returning", label: "Most returned to", note: "Share who came back next day" },
  { key: "newest", label: "Newest", note: "Most recent launch epoch" },
];

/**
 * Browsing, with the sort order stated.
 *
 * Sorting alternatives exist so a visitor can see that the catalogue order is
 * a choice among several defensible ones rather than an act of nature. Each
 * option says what it sorts by. A control labelled "recommended" or "for you"
 * would be the exact sleight of hand this product is objecting to.
 */
export function CatalogueGrid({ epoch }: { epoch: number }) {
  const [category, setCategory] = useState<Category | "All">("All");
  const [sort, setSort] = useState<Sort>("rank");

  const metrics = useMemo(() => cohort(epoch), [epoch]);
  const ranked = useMemo(() => rankCohort(metrics, WEIGHTS_V1), [metrics]);
  const byId = useMemo(() => new Map(metrics.map((m) => [m.gameId, m])), [metrics]);

  const rows = useMemo(() => {
    const filtered = ranked.filter((r) => {
      const g = INDEX.get(r.gameId)!;
      return category === "All" || g.category === category;
    });

    const sorted = [...filtered];
    if (sort === "depth") {
      sorted.sort((a, b) => (byId.get(b.gameId)!.medianSeconds - byId.get(a.gameId)!.medianSeconds));
    } else if (sort === "returning") {
      sorted.sort((a, b) => b.components.retention - a.components.retention);
    } else if (sort === "newest") {
      sorted.sort(
        (a, b) =>
          INDEX.get(b.gameId)!.launchedEpoch - INDEX.get(a.gameId)!.launchedEpoch ||
          a.rank - b.rank,
      );
    }
    return sorted;
  }, [ranked, category, sort, byId]);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-wrap gap-1.5">
          {(["All", ...CATEGORIES] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-lg px-3 py-1.5 text-[12.5px] transition-colors ${
                category === c
                  ? "bg-[var(--color-glass-500)] text-[var(--color-ink-950)]"
                  : "border border-[var(--color-ink-700)] text-[var(--color-mist-300)] hover:border-[var(--color-glass-600)]"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="flex flex-col items-end">
          <div className="flex gap-1.5">
            {SORTS.map((s) => (
              <button
                key={s.key}
                onClick={() => setSort(s.key)}
                className={`rounded-lg px-3 py-1.5 text-[12.5px] transition-colors ${
                  sort === s.key
                    ? "border border-[var(--color-glass-600)] text-[var(--color-glass-300)]"
                    : "border border-[var(--color-ink-700)] text-[var(--color-mist-500)] hover:text-[var(--color-mist-300)]"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[11.5px] text-[var(--color-mist-700)]">
            Sorting by {SORTS.find((s) => s.key === sort)!.note.toLowerCase()}
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="mt-10 text-center text-[13px] text-[var(--color-mist-500)]">
          No games in {category} ranked this epoch.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((r, i) => {
            const g = INDEX.get(r.gameId)!;
            const m = byId.get(r.gameId)!;
            return (
              <Link
                key={r.gameId}
                href={`/game/${g.id}`}
                className="rise group overflow-hidden rounded-2xl border border-[var(--color-ink-700)] bg-[var(--color-ink-900)] transition-colors hover:border-[var(--color-glass-600)]"
                style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
              >
                <div className="relative">
                  <Thumb game={g} className="aspect-[16/9] w-full" />
                  <span className="absolute left-3 top-3 rounded-md bg-[var(--color-ink-950)]/80 px-2 py-0.5 font-mono text-[11px] backdrop-blur">
                    {r.rank}
                  </span>
                  <span className="absolute bottom-3 left-3 text-[11px] text-[var(--color-mist-300)]">
                    {g.category}
                  </span>
                </div>

                <div className="p-4">
                  <h3 className="truncate text-[14px] font-medium group-hover:text-[var(--color-glass-300)]">
                    {g.title}
                  </h3>
                  <p className="mt-0.5 truncate text-[12.5px] text-[var(--color-mist-500)]">
                    {g.creator}
                  </p>

                  <div className="mt-3 h-[3px] overflow-hidden rounded-full bg-[var(--color-ink-800)]">
                    <div
                      className="h-full rounded-full bg-[var(--color-glass-500)]"
                      style={{ width: `${(r.score / BPS) * 100}%` }}
                    />
                  </div>

                  <dl className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <dt className="text-[var(--color-mist-700)]">Sessions</dt>
                      <dd className="font-mono text-[var(--color-mist-300)] tnum">
                        {(m.sessions / 1000).toFixed(0)}k
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[var(--color-mist-700)]">Median</dt>
                      <dd className="font-mono text-[var(--color-mist-300)] tnum">
                        {Math.round(m.medianSeconds / 60)}m
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[var(--color-mist-700)]">Pool</dt>
                      <dd className="font-mono text-[var(--color-amber-400)] tnum">
                        {(r.shareBps / 100).toFixed(1)}%
                      </dd>
                    </div>
                  </dl>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
