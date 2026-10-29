import React from "react";

type P = { size?: number; color: string; stroke?: number };
const S: React.FC<P & { children: React.ReactNode }> = ({ size = 28, color, stroke = 2.2, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

export const IconMenu: React.FC<P> = (p) => (<S {...p}><path d="M4 7h16M4 12h16M4 17h16" /></S>);
export const IconClose: React.FC<P> = (p) => (<S {...p}><path d="M6 6l12 12M18 6L6 18" /></S>);
export const IconSearch: React.FC<P> = (p) => (<S {...p}><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4-4" /></S>);
export const IconBag: React.FC<P> = (p) => (<S {...p}><path d="M5 8h14l-1.2 12H6.2z" /><path d="M9 8a3 3 0 0 1 6 0" /></S>);
export const IconChevron: React.FC<P & { dir: "down" | "start" }> = ({ dir, ...p }) => (
  <S {...p}>{dir === "down" ? <path d="M6 9l6 6 6-6" /> : <path d="M15 6l-6 6 6 6" />}</S>
);
export const IconHome: React.FC<P> = (p) => (<S {...p}><path d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" /></S>);
export const IconGrid: React.FC<P> = (p) => (<S {...p}><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></S>);
export const IconUser: React.FC<P> = (p) => (<S {...p}><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></S>);
export const IconShirt: React.FC<P> = (p) => (<S {...p}><path d="M8 4l-4 3 2 4 2-1v10h8V10l2 1 2-4-4-3a4 4 0 0 1-8 0z" /></S>);
export const IconDress: React.FC<P> = (p) => (<S {...p}><path d="M9 3h6l-1 5 4 12H6l4-12z" /></S>);
export const IconKid: React.FC<P> = (p) => (<S {...p}><circle cx="12" cy="9" r="5" /><path d="M12 14v6M9 20h6" /></S>);
export const IconBall: React.FC<P> = (p) => (<S {...p}><circle cx="12" cy="12" r="8" /><path d="M4.5 9.5c5 1 10 1 15 0M4.5 14.5c5-1 10-1 15 0M12 4c-2.5 5-2.5 11 0 16" /></S>);
export const IconSpark: React.FC<P> = (p) => (<S {...p}><path d="M12 3v5M12 16v5M3 12h5M16 12h5M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3" /></S>);
export const IconSofa: React.FC<P> = (p) => (<S {...p}><path d="M4 12V9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3" /><path d="M3 12h18v5H3zM5 17v2M19 17v2" /></S>);
export const IconCheck: React.FC<P> = (p) => (<S {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></S>);
export const IconTarget: React.FC<P> = (p) => (<S {...p}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="0.8" /></S>);
export const IconMic: React.FC<P> = (p) => (<S {...p}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" /></S>);
export const IconCalendar: React.FC<P> = (p) => (<S {...p}><rect x="4" y="5" width="16" height="15" rx="2.5" /><path d="M4 10h16M8.5 3v4M15.5 3v4" /></S>);
export const IconPlay: React.FC<P> = (p) => (<S {...p}><path d="M8 5.5v13l10.5-6.5z" fill={p.color} /></S>);
export const IconPause: React.FC<P> = (p) => (<S {...p}><path d="M9 5.5v13M15 5.5v13" /></S>);
export const IconPen: React.FC<P> = (p) => (<S {...p}><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13.5 6.5l4 4" /></S>);
export const IconColumns: React.FC<P> = (p) => (<S {...p}><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><path d="M12 4.5v15" /></S>);
export const IconComment: React.FC<P> = (p) => (<S {...p}><path d="M5 5h14a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 17h-8l-4.5 3.5V17H5a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 5 5z" /></S>);
export const IconQuote: React.FC<P> = (p) => (<S {...p}><path d="M10 7H6.5A1.5 1.5 0 0 0 5 8.5V12h4v4.5H5M19 7h-3.5A1.5 1.5 0 0 0 14 8.5V12h4v4.5h-4" /></S>);
export const IconArrowFill: React.FC<P> = (p) => (<S {...p}><path d="M17 17L7 7M7 15V7h8" /></S>);
export const IconCup: React.FC<P> = (p) => (<S {...p}><path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z" /><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16M8 3.5v2.5M11 3.5v2.5" /></S>);
export const IconBack: React.FC<P> = (p) => (<S {...p}><path d="M9 6l6 6-6 6" /></S>);
export const IconClock: React.FC<P> = (p) => (<S {...p}><circle cx="12" cy="12" r="8" /><path d="M12 7.5V12l3 2" /></S>);
export const IconUndo: React.FC<P> = (p) => (<S {...p}><path d="M9 14l-4-4 4-4" /><path d="M5 10h9a5 5 0 0 1 0 10h-3" /></S>);
export const IconSend: React.FC<P> = (p) => (<S {...p}><path d="M20 4L3 11l7 2.5L12.5 21z" /><path d="M10 13.5L20 4" /></S>);
export const IconImage: React.FC<P> = (p) => (<S {...p}><rect x="3.5" y="5" width="17" height="14" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="M20.5 16l-5-5-8 8" /></S>);
export const IconFilm: React.FC<P> = (p) => (<S {...p}><rect x="3.5" y="5" width="17" height="14" rx="2" /><path d="M8 5v14M16 5v14M3.5 9.5H8M3.5 14.5H8M16 9.5h4.5M16 14.5h4.5" /></S>);
export const IconText: React.FC<P> = (p) => (<S {...p}><path d="M5 7h14M5 12h14M5 17h9" /></S>);
export const IconAlert: React.FC<P> = (p) => (<S {...p}><path d="M12 4l9 16H3z" /><path d="M12 10v4.5M12 17.2v.3" /></S>);
export const IconEye: React.FC<P> = (p) => (<S {...p}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="2.8" /></S>);
export const IconHash: React.FC<P> = (p) => (<S {...p}><path d="M9.5 4L8 20M16 4l-1.5 16M4.5 9h15M4 15h15" /></S>);
export const IconLock: React.FC<P> = (p) => (<S {...p}><rect x="5" y="10.5" width="14" height="9.5" rx="2" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></S>);
export const IconLoop: React.FC<P> = (p) => (<S {...p}><path d="M4.5 11a7.5 7.5 0 0 1 13-4.5L19.5 8" /><path d="M19.5 4v4h-4" /><path d="M19.5 13a7.5 7.5 0 0 1-13 4.5L4.5 16" /><path d="M4.5 20v-4h4" /></S>);
export const IconBulb: React.FC<P> = (p) => (<S {...p}><path d="M9 17.5h6M10 21h4" /><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2v1.5h5V16c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3z" /></S>);
export const IconChat: React.FC<P> = (p) => (<S {...p}><path d="M4.5 6.5A2 2 0 0 1 6.5 4.5h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H10l-4.5 3.5v-3.5h0a2 2 0 0 1-1-1.7z" /><path d="M8.5 9.5h7M8.5 12.5h4" /></S>);
