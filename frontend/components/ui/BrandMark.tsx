type BrandMarkProps = { size?: number; className?: string };

/** Shared Fibrion woven-F mark. Keep this geometry in sync with app/icon.svg. */
export function BrandMark({ size = 28, className }: BrandMarkProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="64" height="64" rx="16" fill="#172238" />
      <path d="M17 13H47V21H25V27H43V35H25V51H17V13Z" fill="#629CFF" />
      <path d="M25 21H47V27H25V21Z" fill="#EAF2FF" opacity=".95" />
      <path d="M25 35H43V41H25V35Z" fill="#EAF2FF" opacity=".7" />
      <path d="M17 13H25V21H17V13ZM17 35H25V43H17V35Z" fill="#397EE8" />
    </svg>
  );
}
