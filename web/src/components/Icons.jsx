/* Satu set ikon outline yang konsisten (stroke 2, ujung membulat,      */
/* viewBox 24x24) — dipakai di seluruh situs supaya tidak lagi campur   */
/* emoji, karakter unicode, dan gaya ikon yang berbeda-beda.            */
function Svg({ size = 18, children, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconSwapVertical = (p) => (
  <Svg {...p}>
    <path d="M7 3v14M7 17l-4-4M7 17l4-4" />
    <path d="M17 21V7M17 7l4 4M17 7l-4 4" />
  </Svg>
);

export const IconCopy = (p) => (
  <Svg {...p}>
    <rect x="9" y="9" width="12" height="12" rx="2.5" />
    <path d="M5 15V5a2 2 0 0 1 2-2h10" />
  </Svg>
);

export const IconCheck = (p) => (
  <Svg {...p}>
    <path d="M20 6 9 17l-5-5" />
  </Svg>
);

export const IconShare = (p) => (
  <Svg {...p}>
    <path d="M7 17 17 7M9 7h8v8" />
  </Svg>
);

export const IconStar = ({ filled, ...p }) => (
  <Svg {...p} fill={filled ? "currentColor" : "none"}>
    <path d="M12 3.5l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.4l-5.4 2.9 1-6.1L3.2 10l6.1-.9L12 3.5z" />
  </Svg>
);

export const IconRefresh = (p) => (
  <Svg {...p}>
    <path d="M3 11a9 9 0 0 1 15.3-5.6L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 13a9 9 0 0 1-15.3 5.6L3 16" />
    <path d="M3 21v-5h5" />
  </Svg>
);

export const IconChevronDown = (p) => (
  <Svg {...p}>
    <path d="M6 9l6 6 6-6" />
  </Svg>
);

export const IconClose = (p) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);

export const IconMenu = (p) => (
  <Svg {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Svg>
);

export const IconSend = (p) => (
  <Svg {...p}>
    <path d="M22 2 11 13" />
    <path d="M22 2 15 22l-4-9-9-4 20-7z" />
  </Svg>
);

export const IconSearch = (p) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </Svg>
);

export const IconBolt = (p) => (
  <Svg {...p}>
    <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />
  </Svg>
);

export const IconClock = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.5 2" />
  </Svg>
);

export const IconTrash = (p) => (
  <Svg {...p}>
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
  </Svg>
);

export const IconMessageCircle = (p) => (
  <Svg {...p}>
    <path d="M21 12a8.5 8.5 0 0 1-11.9 7.8L4 21l1.3-4.9A8.5 8.5 0 1 1 21 12z" />
  </Svg>
);

export const IconTrendingUp = (p) => (
  <Svg {...p}>
    <path d="M3 17l6-6 4 4 8-8" />
    <path d="M15 7h6v6" />
  </Svg>
);

export const IconZap = (p) => (
  <Svg {...p}>
    <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />
  </Svg>
);

export const IconGlobe = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
  </Svg>
);

export const IconArrowRight = (p) => (
  <Svg {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
);

export const IconInfo = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v6M12 7.5v.01" />
  </Svg>
);
