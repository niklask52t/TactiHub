export function Compass() {
  return (
    <div className="absolute bottom-16 left-4 z-[5] pointer-events-none select-none opacity-60">
      <svg width="48" height="48" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="22" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground" />
        <polygon points="24,4 20,20 24,16 28,20" className="fill-primary" />
        <polygon points="24,44 20,28 24,32 28,28" className="fill-muted-foreground/50" />
        <text x="24" y="13" textAnchor="middle" fontSize="8" fontWeight="bold" className="fill-primary">N</text>
      </svg>
    </div>
  );
}
