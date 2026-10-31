// Section opener: a brush stroke and the label.
export default function SectionMark({ label }: { label: string }) {
  return <div className="section-mark">
    <span className="section-mark-line" aria-hidden="true" />
    <span className="eyebrow">{label}</span>
  </div>;
}
