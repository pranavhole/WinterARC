/** Quiet, grayscale mountain study. Pure SVG: no image request. */
export function MountainArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 520" className={className} role="img" aria-label="A snow-covered mountain peak">
      <rect width="400" height="520" fill="#EFEEE9" />
      <circle cx="300" cy="120" r="34" fill="#F7F5F0" />
      <path d="M0 330 L70 270 L120 300 L190 230 L250 280 L310 240 L400 300 V520 H0Z" fill="#DDD9D0" />
      <path d="M40 520 L215 150 L260 210 L285 190 L400 360 V520Z" fill="#B9B6AE" />
      <path d="M215 150 L240 230 L228 270 L250 320 L236 380 L262 520 H400 V360 L285 190 L260 210Z" fill="#8E8B84" />
      <path d="M215 150 L188 208 L204 202 L214 230 L226 196 L244 222 L260 210Z" fill="#FFFFFF" />
      <path d="M260 210 L285 190 L300 212 L286 208 L276 226Z" fill="#F7F5F0" />
      <path d="M0 430 L90 380 L160 420 L240 390 L320 430 L400 400 V520 H0Z" fill="#DDD9D0" opacity="0.9" />
      <path d="M0 470 L110 440 L200 470 L300 450 L400 475 V520 H0Z" fill="#EFEEE9" />
    </svg>
  );
}
