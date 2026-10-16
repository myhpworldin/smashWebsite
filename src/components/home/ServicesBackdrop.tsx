import styles from "./ServicesSection.module.css";

/** The growth curve, as one smooth path through its data points (viewBox 1440×813, the band's size at the 1440 design width). */
const CURVE =
  "M-40 708 C-8 701 93 670 150 668 C207 666 247 706 300 694 C353 682 417 609 470 596 C523 583 565 636 620 616 C675 596 743 494 800 476 C857 458 905 529 960 506 C1015 483 1075 377 1130 336 C1185 295 1232 295 1290 262 C1348 229 1448 160 1480 140";
/** The plotted points: [x, y]; the last is the highlighted one. */
const NODES: [number, number][] = [[300, 694], [620, 616], [960, 506], [1130, 336], [1290, 262]];
const BASELINE = 770;
const GRID_ROWS = [130, 260, 390, 520, 650];
const BARS = [34, 52, 44, 78, 70, 112, 98, 148, 176];

/**
 * Decorative backdrop for the Home "Our Services" band: a faint growth chart — hairline grid, a rising curve with
 * plotted points and drop lines, a few bars, and a blue-and-red glow in the corners (the brand's two colours).
 * Everything is drawn at a few percent white so it reads as texture, not content, and a vertical mask pulls the
 * chart further back behind the middle band, where the headings and cards sit. Pure SVG, no script, no images;
 * `aria-hidden` and click-through. The last point pulses gently (off with reduced motion).
 */
export function ServicesBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[813px] overflow-hidden lg:inset-0 lg:h-auto">
      <svg className="size-full" viewBox="0 0 1440 813" preserveAspectRatio="xMidYMid slice" fill="none">
        <defs>
          <linearGradient id="svc-line" x1="0" y1="0" x2="1440" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#0058c8" stopOpacity="0" />
            <stop offset="0.4" stopColor="#0058c8" stopOpacity="0.55" />
            <stop offset="0.85" stopColor="#4d8dff" stopOpacity="0.6" />
            <stop offset="1" stopColor="#e90101" stopOpacity="0.55" />
          </linearGradient>
          <linearGradient id="svc-fade" x1="0" y1="0" x2="0" y2="813" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#fff" stopOpacity="1" />
            <stop offset="0.3" stopColor="#fff" stopOpacity="0.55" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0.28" />
            <stop offset="0.75" stopColor="#fff" stopOpacity="0.7" />
            <stop offset="1" stopColor="#fff" stopOpacity="1" />
          </linearGradient>
          <radialGradient id="svc-blue" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#0058c8" stopOpacity="0.2" />
            <stop offset="1" stopColor="#0058c8" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="svc-red" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#e90101" stopOpacity="0.12" />
            <stop offset="1" stopColor="#e90101" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="svc-edge" cx="0.5" cy="0.5" r="0.62">
            <stop offset="0.45" stopColor="#fff" stopOpacity="1" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <mask id="svc-chart-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="1440" height="813">
            <rect width="1440" height="813" fill="url(#svc-fade)" />
          </mask>
          <mask id="svc-grid-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="1440" height="813">
            <rect width="1440" height="813" fill="url(#svc-edge)" />
          </mask>
        </defs>

        <ellipse cx="1240" cy="40" rx="520" ry="360" fill="url(#svc-blue)" />
        <ellipse cx="120" cy="800" rx="460" ry="300" fill="url(#svc-red)" />

        <g mask="url(#svc-grid-mask)" stroke="#fff" strokeWidth="1">
          {GRID_ROWS.map((y) => <line key={y} x1="0" x2="1440" y1={y} y2={y} strokeOpacity="0.05" />)}
          {Array.from({ length: 10 }, (_, i) => 80 + i * 160).map((x) => <line key={x} x1={x} x2={x} y1="0" y2={BASELINE} strokeOpacity="0.03" />)}
        </g>

        <g mask="url(#svc-chart-mask)">
          <line x1="0" x2="1440" y1={BASELINE} y2={BASELINE} stroke="#fff" strokeOpacity="0.1" />
          {Array.from({ length: 19 }, (_, i) => i * 80).map((x) => <line key={x} x1={x} x2={x} y1={BASELINE} y2={BASELINE + 6} stroke="#fff" strokeOpacity="0.14" />)}

          {BARS.map((h, i) => <rect key={i} x={1000 + i * 44} y={BASELINE - h} width="18" height={h} rx="2" fill="#fff" fillOpacity="0.035" />)}

          {NODES.map(([x, y]) => <line key={x} x1={x} x2={x} y1={y + 10} y2={BASELINE} stroke="#fff" strokeOpacity="0.09" strokeDasharray="3 7" />)}

          <path d={CURVE} stroke="url(#svc-line)" strokeWidth="1.5" strokeLinecap="round" />

          {NODES.slice(0, -1).map(([x, y]) => (
            <g key={x}>
              <circle cx={x} cy={y} r="9" stroke="#fff" strokeOpacity="0.14" />
              <circle cx={x} cy={y} r="3" fill="#fff" fillOpacity="0.4" />
            </g>
          ))}
          <g>
            <circle cx={NODES[4][0]} cy={NODES[4][1]} r="26" fill="#e90101" fillOpacity="0.1" className={styles.pulse} />
            <circle cx={NODES[4][0]} cy={NODES[4][1]} r="10" stroke="#e90101" strokeOpacity="0.7" />
            <circle cx={NODES[4][0]} cy={NODES[4][1]} r="3.5" fill="#e90101" />
          </g>
        </g>
      </svg>
    </div>
  );
}
