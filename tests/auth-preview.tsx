import { useRef, useState, type ReactNode } from 'react';
import { SessionProvider } from '../src/auth/session';

// Loaded only by Playwright's module interception. No runtime flag or production authentication bypass.
export function BoothAuthProvider({ children }: { children: ReactNode }) {
 const [signedIn, setSignedIn] = useState(new URL(import.meta.url).searchParams.get('initial') !== 'signed-out');
 const dialog = useRef<HTMLDialogElement>(null);
 return <SessionProvider session={{
  phase: signedIn ? 'signed-in' : 'signed-out', sessionId: signedIn ? 'browser-fixture-session' : null,
  name: 'Test DJ', email: 'dj@example.test', getToken: async () => signedIn ? 'browser-fixture-token' : null,
  signIn: () => dialog.current?.showModal(), manageAccount: () => {}, signOut: async () => setSignedIn(false),
 }}>
  {children}
  <aside aria-label="Test identity controls" style={{ position: 'fixed', bottom: 8, right: 8, zIndex: 20, padding: 6, background: '#fff1b8', color: '#342f27', font: '11px Arial' }}>Simulated identity · no real login <button onClick={() => setSignedIn(false)}>Expire test session</button></aside>
  <dialog ref={dialog} aria-label="Simulated sign-in"><p>Test identity only. No email is sent.</p><button onClick={() => { setSignedIn(true); dialog.current?.close(); }}>Complete simulated sign-in</button></dialog>
 </SessionProvider>;
}
