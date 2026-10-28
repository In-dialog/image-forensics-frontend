export function EditorIcon({ name }: { name: 'add' | 'up' | 'down' | 'copy' | 'remove' | 'next' }) {
  const paths = {
    add: <path d="M8 3v10M3 8h10" />,
    up: <path d="m4 9 4-4 4 4" />,
    down: <path d="m4 6 4 4 4-4" />,
    copy: <><rect x="5" y="5" width="8" height="8" rx="1" /><path d="M10 3H3v7" /></>,
    remove: <><path d="M3 4h10M6 4V2h4v2M4 4l1 10h6l1-10M7 7v4M9 7v4" /></>,
    next: <path d="m6 4 4 4-4 4" />,
  };
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor"
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{paths[name]}</svg>;
}
