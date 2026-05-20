type MarkOptions = { maskable?: boolean };

// Shared paperclip brand mark for the favicon (icon.tsx) and PWA icons
// (icon-192, icon-512). Scaled off a 192px reference design.
// maskable: drop the rounded corners so the platform mask isn't double-clipped.
export function paperclipMark(canvas: number, opts: MarkOptions = {}) {
  const s = canvas / 192;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#4F46E5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: opts.maskable ? 0 : 36 * s,
      }}
    >
      <div
        style={{
          position: "relative",
          width: 70 * s,
          height: 110 * s,
          border: `${11 * s}px solid white`,
          borderRadius: 35 * s,
          display: "flex",
        }}
      >
        <div
          style={{
            position: "absolute",
            bottom: -11 * s,
            left: -11 * s,
            width: 50 * s,
            height: 82 * s,
            border: `${11 * s}px solid white`,
            borderRadius: 25 * s,
            display: "flex",
          }}
        />
      </div>
    </div>
  );
}
