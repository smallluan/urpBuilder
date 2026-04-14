type Props = {
  size: number;
  /** 与 defs 内 gradient id 前缀一致，避免同页多实例冲突 */
  uid: string;
  className?: string;
};

/** 分层蓝底 + 白 U，与主 Logo 一致 */
export function UrpBuilderLogoMark({ size, uid, className }: Props) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id={`${uid}-base`} x1="6" y1="4" x2="44" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0034a8" />
          <stop offset="0.45" stopColor="#0052d9" />
          <stop offset="1" stopColor="#2b7eee" />
        </linearGradient>
        <linearGradient id={`${uid}-fold`} x1="4" y1="40" x2="46" y2="8" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5d9eff" stopOpacity="0.95" />
          <stop offset="0.55" stopColor="#0052d9" stopOpacity="0.55" />
          <stop offset="1" stopColor="#0034a8" stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id={`${uid}-shine`} x1="10" y1="8" x2="34" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="40" height="40" rx="11" fill={`url(#${uid}-base)`} />
      <path
        d="M4 28 L26 4 L44 14 L44 44 L14 44 L4 36 Z"
        fill={`url(#${uid}-fold)`}
        opacity={0.88}
      />
      <path
        d="M4 32 L30 8 L44 18 L44 44 L8 44 L4 38 Z"
        fill="#0052d9"
        opacity={0.35}
      />
      <ellipse cx="18" cy="14" rx="14" ry="9" fill={`url(#${uid}-shine)`} />
      <text
        x="24"
        y="33.5"
        textAnchor="middle"
        fontSize="26"
        fontWeight="800"
        fill="#ffffff"
        fontFamily="ui-sans-serif, system-ui, Segoe UI, sans-serif"
      >
        U
      </text>
    </svg>
  );
}
