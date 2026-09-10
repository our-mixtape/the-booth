import { useEffect, useId, useRef, useState } from 'react';
import { useBoothSession } from './session';
import './account.css';

export function AccountButton({ label = 'Sign in' }: { label?: string }) {
 const session = useBoothSession(); const titleId = useId();
 const dialog = useRef<HTMLDialogElement>(null); const opener = useRef<HTMLButtonElement>(null);
 const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
 const signedIn = session.phase === 'signed-in';
 useEffect(() => { if (!signedIn) dialog.current?.close(); }, [signedIn]);
 function open() {
  setError('');
  if (session.phase === 'signed-out') { session.signIn(); return; }
  dialog.current?.showModal();
 }
 async function signOut() {
  setBusy(true); setError('');
  // Stop assistance as soon as sign-out is requested, including while the provider responds.
  window.dispatchEvent(new Event('booth:sign-out'));
  try { await session.signOut(); dialog.current?.close(); }
  catch { setError('Sign-out could not finish. Please try again.'); }
  finally { setBusy(false); }
 }
 return <>
  <button className="account-button" ref={opener} disabled={session.phase === 'loading'} onClick={open}>
   {session.phase === 'loading' ? 'Checking sign-in…' : signedIn ? 'Your account' : label}
  </button>
  <dialog ref={dialog} className="account-dialog" aria-labelledby={titleId} onClose={() => opener.current?.focus()} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }} onKeyDown={event => event.stopPropagation()}>
   <div className="account-sheet">
    <button className="account-close" aria-label="Close account" onClick={() => dialog.current?.close()}>×</button>
    <div className="account-art" aria-hidden="true"><span>MIXTAPE / THE BOOTH</span><div className="account-record"><i>✳</i></div><span>ALWAYS YOUR HANDS.<br/>ALWAYS YOUR MIX.</span></div>
    <div className="account-copy"><p className="eyebrow">YOUR PLACE IN THE MIX</p><h2 id={titleId}>{signedIn ? <>Welcome back.<br/><em>Find your feel.</em></> : <>A little help.<br/><em>More room to play.</em></>}</h2>
     {signedIn ? <><p className="account-identity">{session.name}<br/><small>{session.email}</small></p><p>You’re signed in for Astra and voice. Your tracks and mixer stay in this browser.</p><div className="account-actions"><button className="primary" disabled={busy} onClick={() => { dialog.current?.close(); session.manageAccount(); }}>Manage account ↗</button><button disabled={busy} onClick={() => void signOut()}>{busy ? 'Signing out…' : 'Sign out'}</button></div></> : <><p>Play freely. Sign in when you want Astra’s next-move hints or voice companion.</p><p className="account-notice" role="status">{session.phase === 'unconfigured' ? 'Sign-in is being set up. The instrument is ready to play in the meantime.' : 'Sign-in couldn’t connect. Please try again shortly; you can keep mixing.'}</p><button className="primary" onClick={() => dialog.current?.close()}>Keep playing ↗</button></>}
     {error && <p role="alert">{error}</p>}<small className="account-footnote">A separate account for The Booth.</small>
    </div>
   </div>
  </dialog>
 </>;
}
