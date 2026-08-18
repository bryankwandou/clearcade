import type { Game } from "@/lib/data";

/**
 * Cover art, drawn rather than uploaded.
 *
 * A catalogue needs to look like a catalogue — the wall of colour is the
 * whole visual argument for a platform with thousands of games on it — but
 * shipping sixteen invented cover images would mean sixteen files nobody
 * drew. Each cover is generated from the game's own hue pair and a shape
 * chosen by its id, so the grid has real variety and weighs nothing.
 */
export function Thumb({ game, className = "" }: { game: Game; className?: string }) {
  const [a, b] = game.hue;
  const variant = game.id.charCodeAt(0) % 4;

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        background: `linear-gradient(145deg, hsl(${a} 62% 26%), hsl(${b} 58% 13%))`,
      }}
    >
      <svg viewBox="0 0 160 96" className="absolute inset-0 h-full w-full" aria-hidden="true">
        {variant === 0 && (
          <g fill="none" stroke={`hsl(${a} 80% 70%)`} strokeOpacity="0.5">
            {[...Array(7)].map((_, i) => (
              <circle key={i} cx="118" cy="72" r={12 + i * 13} strokeWidth="1" />
            ))}
          </g>
        )}
        {variant === 1 && (
          <g stroke={`hsl(${b} 85% 72%)`} strokeOpacity="0.42" strokeWidth="1.2">
            {[...Array(11)].map((_, i) => (
              <line key={i} x1={-20 + i * 20} y1="96" x2={26 + i * 20} y2="0" />
            ))}
          </g>
        )}
        {variant === 2 && (
          <g fill={`hsl(${a} 75% 66%)`} fillOpacity="0.28">
            {[...Array(5)].map((_, i) =>
              [...Array(3)].map((_, j) => (
                <rect
                  key={`${i}-${j}`}
                  x={12 + i * 30}
                  y={10 + j * 28}
                  width={10 + ((i + j) % 3) * 9}
                  height="12"
                  rx="2"
                />
              )),
            )}
          </g>
        )}
        {variant === 3 && (
          <g fill="none" stroke={`hsl(${b} 82% 74%)`} strokeOpacity="0.45" strokeWidth="1.4">
            <path d="M0 74 Q40 40 80 62 T160 42" />
            <path d="M0 86 Q40 54 80 76 T160 56" strokeOpacity="0.28" />
            <path d="M0 62 Q40 26 80 48 T160 28" strokeOpacity="0.2" />
          </g>
        )}
      </svg>

      {/* Keeps title text legible over whichever pattern landed underneath. */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
    </div>
  );
}
