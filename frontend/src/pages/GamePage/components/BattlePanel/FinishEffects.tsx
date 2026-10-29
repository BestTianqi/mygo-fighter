const clamp = (n: number) => Math.max(0, Math.min(1, n));

/** Deterministic art-clock effects: pause, restore and reduced motion need no timers. */
export function FinishEffects({
  age,
  color,
  reducedMotion,
}: {
  age: number;
  color: string;
  reducedMotion: boolean;
}) {
  const burst = reducedMotion ? 0 : 1 - clamp(age / 850);
  const radius = reducedMotion ? 220 : 55 + clamp(age / 900) * 480;
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 960 540"
      preserveAspectRatio="none"
      className="absolute inset-0 h-full w-full"
    >
      <path
        d="M0 52L960 0V38L0 105ZM0 500L960 438V487L0 540Z"
        fill={color}
        opacity=".25"
      />
      <path
        d="M0 93L960 28M0 514L960 469"
        stroke="#f6d68e"
        strokeWidth="3"
        opacity=".8"
      />
      <path d="M370 540L535 0H605L440 540Z" fill={color} opacity=".12" />
      {Array.from({ length: 18 }, (_, i) => {
        const angle = (i * Math.PI * 2) / 18;
        const c = Math.cos(angle),
          s = Math.sin(angle);
        return (
          <path
            key={i}
            d={`M${480 + c * radius * 0.45} ${270 + s * radius * 0.45}L${480 + c * 760} ${270 + s * 760}`}
            stroke={i % 3 ? color : "#ffe7ac"}
            strokeWidth={i % 3 ? 2 : 6}
            opacity={burst * (i % 3 ? 0.4 : 0.8)}
          />
        );
      })}
      <circle
        cx="480"
        cy="270"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="18"
        opacity={burst * 0.45}
      />
      <circle
        cx="480"
        cy="270"
        r={radius * 0.8}
        fill="none"
        stroke="#ffe7ac"
        strokeWidth="3"
        opacity={burst}
      />
      <path
        d="M585 195L960 168V323L565 352L592 320L552 304L580 276L556 253Z"
        fill="#100e16"
        opacity=".85"
      />
      <rect
        width="960"
        height="540"
        fill="#fff4df"
        opacity={reducedMotion ? 0 : (1 - clamp(age / 180)) * 0.6}
      />
    </svg>
  );
}
