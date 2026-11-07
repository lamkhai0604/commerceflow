import { test as base } from '@playwright/test';
// Offline public-asset isolation only. Auth/API requests use the real HTTPS stack.
// Existing CSS imports remote fonts; an empty stylesheet avoids a chunk-load failure.
export const test = base.extend({
  context: async ({ context }, use) => {
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin === 'https://localhost:8443') return route.continue();
      if (url.hostname === 'fonts.googleapis.com' && route.request().resourceType() === 'stylesheet')
        return route.fulfill({ status: 200, contentType: 'text/css', body: '/* offline font fixture; system fallback fonts */' });
      return route.abort(); // Never contact legacy commerce/cloud services or public assets.
    });
    await use(context);
  },
});
