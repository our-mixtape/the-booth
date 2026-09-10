import type { Page } from '@playwright/test';

/** Browser-only identity stand-in. Server verification is exercised separately with real signed JWTs. */
export async function mockBrowserAuth(page: Page, initial: 'signed-in' | 'signed-out' = 'signed-in') {
 await page.route(/\/src\/auth\/Provider\.tsx(?:\?.*)?$/, route => route.fulfill({ contentType: 'application/javascript', body: `export { BoothAuthProvider } from '/tests/auth-preview.tsx?initial=${initial}';` }));
}
