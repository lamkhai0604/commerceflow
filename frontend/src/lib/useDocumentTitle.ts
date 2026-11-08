import { useEffect } from 'react';

const SITE = 'CommerceFlow';

/** Sets a descriptive page title for each route (announced by screen readers on navigation). */
export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE}` : `${SITE} — Home and lifestyle goods`;
  }, [title]);
}
