import { createContext, useContext, type ReactNode } from 'react';
import { sessionEndpoint } from '../agent/gateway';

export type BoothSession = {
 phase: 'loading' | 'signed-out' | 'signed-in' | 'unconfigured' | 'error';
 sessionId: string | null;
 name: string;
 email: string;
 getToken: () => Promise<string | null>;
 signIn: () => void;
 manageAccount: () => void;
 signOut: () => Promise<void>;
};
export const unavailableSession: BoothSession = {
 phase: 'unconfigured', sessionId: null, name: '', email: '',
 getToken: async () => null, signIn: () => {}, manageAccount: () => {}, signOut: async () => {},
};
const SessionContext = createContext<BoothSession>(unavailableSession);
export function SessionProvider({ session, children }: { session: BoothSession; children: ReactNode }) {
 return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}
export function useBoothSession() { return useContext(SessionContext); }

export class SignInRequiredError extends Error {
 constructor() { super('Your sign-in has expired. Sign out and sign in again to use Astra.'); }
}
export async function sessionFetch(getToken: BoothSession['getToken'], path: '/api/hint' | '/api/voice/session' | '/api/session/brief' | '/api/session/steer' | '/api/session/tool', init: RequestInit) {
 const token = await getToken();
 init.signal?.throwIfAborted();
 if (!token) throw new SignInRequiredError();
 const headers = new Headers(init.headers); headers.set('Authorization', `Bearer ${token}`);
 // Same-origin cookies preserve Vercel deployment protection; the gateway still requires the bearer session.
 const response = await fetch(sessionEndpoint(path), { ...init, headers, credentials: 'same-origin', redirect: 'error' });
 if (response.status === 401) throw new SignInRequiredError();
 return response;
}
