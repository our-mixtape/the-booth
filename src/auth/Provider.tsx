import { Component, useEffect, useState, type ReactNode } from 'react';
import { ClerkProvider, useAuth, useClerk, useUser } from '@clerk/react';
import { SessionProvider, unavailableSession } from './session';

const appearance = {
 variables: { colorPrimary: '#243d32', colorBackground: '#f8f2e7', colorForeground: '#26382f', colorMutedForeground: '#63645a', colorInputBackground: '#fffdf7', borderRadius: '0.5rem', fontFamily: 'Arial, sans-serif', fontFamilyButtons: 'Arial, sans-serif' },
 elements: { cardBox: { boxShadow: '0 24px 90px #172b2540' }, headerTitle: { fontFamily: 'Georgia, serif', fontSize: '1.85rem', fontWeight: 400 }, formButtonPrimary: { minHeight: '44px' }, socialButtonsBlockButton: { minHeight: '44px' }, footer: { background: '#f0e7d7' } },
};

// Clerk calls these for same-site completion. Keep the instrument mounted and its audio clock running.
function navigate(to: string, replace = false) {
 const url = new URL(to, window.location.origin);
 if (url.origin !== window.location.origin) { window.location.assign(url.href); return; }
 window.history[replace ? 'replaceState' : 'pushState'](null, '', url.href);
 window.dispatchEvent(new PopStateEvent('popstate'));
}
function ClerkSession({ children }: { children: ReactNode }) {
 const { isLoaded, isSignedIn, sessionId, getToken } = useAuth();
 const { user } = useUser(); const clerk = useClerk();
 const [timedOut, setTimedOut] = useState(false);
 useEffect(() => { if (isLoaded) return; const timer = setTimeout(() => setTimedOut(true), 12000); return () => clearTimeout(timer); }, [isLoaded]);
 return <SessionProvider session={{
  phase: !isLoaded ? timedOut ? 'error' : 'loading' : isSignedIn ? 'signed-in' : 'signed-out',
  sessionId: isSignedIn ? sessionId : null, name: user?.firstName || 'Your Booth account', email: user?.primaryEmailAddress?.emailAddress || '',
  getToken: () => getToken(),
  signIn: () => { const destination = `${location.pathname}${location.search}#play`; clerk.openSignIn({ withSignUp: true, oauthFlow: 'popup', forceRedirectUrl: destination, signUpForceRedirectUrl: destination }); },
  manageAccount: () => clerk.openUserProfile(),
  signOut: () => clerk.signOut(() => {}),
 }}>{children}</SessionProvider>;
}
class AuthBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
 state = { failed: false };
 static getDerivedStateFromError() { return { failed: true }; }
 render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
export function BoothAuthProvider({ children }: { children: ReactNode }) {
 const key = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
 if (!key) return <SessionProvider session={unavailableSession}>{children}</SessionProvider>;
 return <AuthBoundary fallback={<SessionProvider session={{ ...unavailableSession, phase: 'error' }}>{children}</SessionProvider>}>
  <ClerkProvider publishableKey={key} appearance={appearance} telemetry={false} routerPush={to => navigate(to)} routerReplace={to => navigate(to, true)} localization={{ signIn: { start: { title: 'Your place in the mix.', subtitle: 'Sign in to The Booth to use Astra.' } } }}>
   <ClerkSession>{children}</ClerkSession>
  </ClerkProvider>
 </AuthBoundary>;
}
