export default function GridOverlay() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Crosshair grid lines */}
      <div
        className="absolute inset-0 grid-overlay opacity-100"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)
          `,
          backgroundSize: '200px 200px',
        }}
      />

      {/* Crosshair + markers at intersections */}
      <svg className="absolute inset-0 w-full h-full opacity-30">
        <defs>
          <pattern id="crosshair" x="0" y="0" width="200" height="200" patternUnits="userSpaceOnUse">
            {/* Horizontal tick */}
            <line x1="196" y1="0" x2="204" y2="0" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
            {/* Vertical tick */}
            <line x1="200" y1="-4" x2="200" y2="4" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#crosshair)" />
      </svg>
    </div>
  );
}
