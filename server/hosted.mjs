import { createHandler } from './index.mjs';

// Force the hosted boundary even in a local function emulator.
export default createHandler({ env: { ...process.env, VERCEL: '1' } });
