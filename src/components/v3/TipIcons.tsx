/** Small stroke icons for the results "Your tips" cards, matching the emblem style. Decorative. */
const Svg = ({ children }: { children: React.ReactNode }) => (
  <svg className="tip-icon" viewBox="0 0 32 32" width={28} height={28} aria-hidden="true" focusable="false">
    {children}
  </svg>
);

export const MeetingIcon = () => (
  <Svg>
    <circle cx="9" cy="10" r="4" />
    <circle cx="23" cy="10" r="4" />
    <circle cx="16" cy="23" r="4" />
    <path d="M12.5 12.5 14 20M19.5 12.5 18 20M13 10h6" />
  </Svg>
);

export const TakePartIcon = () => (
  <Svg>
    <path d="M6 8.5A3.5 3.5 0 0 1 9.5 5h13A3.5 3.5 0 0 1 26 8.5v8a3.5 3.5 0 0 1-3.5 3.5H15l-6 5v-5h0a3 3 0 0 1-3-3Z" />
    <path d="M11 12.5h10" />
  </Svg>
);

export const ContentIcon = () => (
  <Svg>
    <path d="M16 6a8 8 0 0 0-4.5 14.6V24h9v-3.4A8 8 0 0 0 16 6Z" />
    <path d="M13 28h6" />
  </Svg>
);

export const CommunicationIcon = () => (
  <Svg>
    <rect x="5" y="8" width="22" height="16" rx="3.5" />
    <path d="m6.5 10 9.5 7 9.5-7" />
  </Svg>
);

export const PaceIcon = () => (
  <Svg>
    <circle cx="16" cy="17" r="10" />
    <path d="M16 11v6l4 3M13 4h6" />
  </Svg>
);
