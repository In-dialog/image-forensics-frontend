const pictograms = {
  composition: <><rect x="3" y="4" width="18" height="16" rx="1" /><path d="M10 4v16M10 11h11" /></>,
  elements: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 17.5h7M17.5 14v7" /></>,
  semantics: <><path d="m7 7 4 4m2 2 4 4M7 17l4-4m2-2 4-4" /><circle cx="5" cy="5" r="2" /><circle cx="19" cy="5" r="2" /><circle cx="5" cy="19" r="2" /><circle cx="19" cy="19" r="2" /><circle cx="12" cy="12" r="2" /></>,
  validation: <><path d="m12 3 8 3v6c0 4-4 7-8 9-4-2-8-5-8-9V6z" /><path d="m8 12 3 3 5-6" /></>,
  clusters: <><circle cx="7" cy="8" r="4" /><circle cx="17" cy="8" r="4" /><circle cx="12" cy="17" r="4" /><path d="M7 8h.01M17 8h.01M12 17h.01" /></>,
  rankings: <><path d="M4 5h2m-2 7h2m-2 7h2" /><path d="M10 3h10v4H10zM10 10h7v4h-7zM10 17h4v4h-4z" /></>,
  home: <><path d="m3 10 9-7 9 7M6 8v13h12V8" /><path d="M10 21v-7h4v7" /></>,
  database: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0" /></>,
  analysis: <><rect x="3" y="4" width="14" height="16" rx="1" /><path d="m6 15 3-4 3 3M17 12h6m-3-3v6" /><circle cx="8" cy="8" r=".75" /></>,
  about: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6m0-10h.01" /></>,
};

export type NavigationIconName = keyof typeof pictograms;

export function NavigationIcon({ name, size = 18, className }: {
  name: NavigationIconName; size?: number; className?: string;
}) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"
    className={className} style={{ flexShrink: 0 }}>{pictograms[name]}</svg>;
}
