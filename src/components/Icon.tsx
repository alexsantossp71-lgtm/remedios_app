import type { SVGProps } from 'react';

export type IconName =
  | 'plus'
  | 'pill'
  | 'bell'
  | 'settings'
  | 'check'
  | 'close'
  | 'clock'
  | 'calendar'
  | 'trash'
  | 'edit'
  | 'pause'
  | 'play'
  | 'chevron-left'
  | 'chevron-right'
  | 'download'
  | 'upload'
  | 'volume'
  | 'volume-off'
  | 'info'
  | 'target'
  | 'snooze'
  | 'shield'
  | 'smartphone'
  | 'refresh'
  | 'more'
  | 'skip';

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

export const Icon = ({ name, size = 20, ...props }: IconProps) => {
  const content = (() => {
    switch (name) {
      case 'plus':
        return <><path d="M12 5v14" /><path d="M5 12h14" /></>;
      case 'pill':
        return <><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" /><path d="m8.5 8.5 7 7" /></>;
      case 'bell':
        return <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>;
      case 'settings':
        return <><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></>;
      case 'check':
        return <path d="m5 12 4 4L19 6" />;
      case 'close':
        return <><path d="m18 6-12 12" /><path d="m6 6 12 12" /></>;
      case 'clock':
        return <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>;
      case 'calendar':
        return <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>;
      case 'trash':
        return <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6" /></>;
      case 'edit':
        return <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></>;
      case 'pause':
        return <><path d="M9 5v14M15 5v14" /></>;
      case 'play':
        return <path d="m8 5 11 7-11 7Z" />;
      case 'chevron-left':
        return <path d="m15 18-6-6 6-6" />;
      case 'chevron-right':
        return <path d="m9 18 6-6-6-6" />;
      case 'download':
        return <><path d="M12 3v12m0 0 4-4m-4 4-4-4" /><path d="M5 20h14" /></>;
      case 'upload':
        return <><path d="M12 16V4m0 0 4 4m-4-4L8 8" /><path d="M5 20h14" /></>;
      case 'volume':
        return <><path d="M11 5 6 9H3v6h3l5 4Z" /><path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12" /></>;
      case 'volume-off':
        return <><path d="M11 5 6 9H3v6h3l5 4Z" /><path d="m17 9 4 4m0-4-4 4" /></>;
      case 'info':
        return <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>;
      case 'target':
        return <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>;
      case 'snooze':
        return <><path d="M5 7h6l-6 7h6M14 10h5l-5 6h5" /><path d="M12 3a9 9 0 1 1-9 9" /></>;
      case 'shield':
        return <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></>;
      case 'smartphone':
        return <><rect x="6" y="2" width="12" height="20" rx="2" /><path d="M10 18h4" /></>;
      case 'refresh':
        return <><path d="M20 7v5h-5" /><path d="M4 17v-5h5" /><path d="M6.1 9A7 7 0 0 1 18 6l2 6M18 15a7 7 0 0 1-12 3l-2-6" /></>;
      case 'more':
        return <><circle cx="5" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="19" cy="12" r="1" fill="currentColor" /></>;
      case 'skip':
        return <><path d="m5 5 14 14" /><path d="M19 5 5 19" /></>;
    }
  })();

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
      {...props}
    >
      {content}
    </svg>
  );
};
