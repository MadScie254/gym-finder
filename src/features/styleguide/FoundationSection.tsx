import { Section, sg, Specimen } from "./parts";

const COLOURS = [
  { token: "bg", name: "Chalk", use: "Page" },
  { token: "surface", name: "White enamel", use: "Cards, sheets" },
  { token: "text", name: "Plate", use: "Text" },
  { token: "text-muted", name: "Slate", use: "Secondary text" },
  { token: "action", name: "Cobalt", use: "Primary action, links" },
  { token: "highlight", name: "Signal", use: "Open now, active filter" },
  { token: "ok", name: "Court", use: "Verified, open" },
  { token: "danger", name: "Stop", use: "Closed, errors" },
  { token: "plate", name: "Plate block", use: "Distance block" },
  { token: "line-strong", name: "Control edge", use: "Chip and field borders" },
];

const SIZES = [
  { px: 52, sample: "1.2 km", sign: true },
  { px: 38, sample: "Gyms in Kilimani", sign: true },
  { px: 28, sample: "Salute Gym", sign: true },
  { px: 22, sample: "Lystra Gym And Spa", sign: true },
  { px: 18, sample: "Umoja 2, Nairobi", sign: false },
  { px: 16, sample: "Hours not listed. Call to confirm before you travel.", sign: false },
  { px: 14, sample: "Corroborated by two map sources", sign: false },
  { px: 12, sample: "Straight line", sign: false },
];

export function FoundationSection() {
  return (
    <Section id="sg-foundation" title="Foundations" note="Enamel colour, condensed sign lettering, big honest numerals. Ratios for every pair are in docs/DESIGN_SYSTEM.md.">
      <Specimen title="Colour" caption="Semantic tokens. Components never use raw hex.">
        <ul className={sg.swatches} role="list">
          {COLOURS.map((colour) => (
            <li key={colour.token} className={sg.swatch}>
              <span className={sg.chipColour} style={{ background: `var(--color-${colour.token})` }} />
              <strong>{colour.name}</strong>
              <span className={sg.token}>--color-{colour.token}, {colour.use.toLowerCase()}</span>
            </li>
          ))}
        </ul>
      </Specimen>
      <Specimen title="Type" caption="Archivo, one variable file. Width 75 to 78 for signs and numerals, 100 for reading.">
        <div>
          {SIZES.map((size) => (
            <div key={size.px} className={sg.typeRow}>
              <span className={sg.typeSize}>{size.px}</span>
              <span
                className={sg.typeSample}
                style={{
                  fontSize: `${size.px / 16}rem`,
                  fontStretch: size.sign ? "var(--font-width-sign)" : "100%",
                  fontWeight: size.sign ? "var(--font-weight-sign)" : "var(--font-weight-body)",
                  lineHeight: size.sign ? 1.05 : 1.35,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {size.sample}
              </span>
            </div>
          ))}
        </div>
      </Specimen>
    </Section>
  );
}
