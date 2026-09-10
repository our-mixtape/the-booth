import { useEffect, useRef, useState } from 'react';

type NameProps = { djName: string; onAccept: (name: string) => void; onSkip: () => void };
const favorites = [['🦁', 'Lion'], ['🐬', 'Dolphin'], ['🐉', 'Dragon'], ['🦊', 'Fox'], ['🤖', 'Robot'], ['🦉', 'Owl']];
const tidy = (value: string) => value.trim().replace(/\s+/g, ' ');

function useNameHeading(step: string | number) {
 const heading = useRef<HTMLHeadingElement>(null);
 useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); heading.current?.focus({ preventScroll: true }); }, [step]);
 return heading;
}

function SkipName({ djName, onSkip }: Pick<NameProps, 'djName' | 'onSkip'>) {
 return <button className="experience-skip" onClick={onSkip}>{djName ? `Keep ${djName} & continue →` : 'Skip for now →'}</button>;
}

function AfterhoursNameFlow({ djName, onAccept, onSkip }: NameProps) {
 const [mode, setMode] = useState<'enter' | 'create'>('enter');
 const [ownName, setOwnName] = useState(djName), [mascot, setMascot] = useState(''), [pasta, setPasta] = useState('');
 const [revealed, setRevealed] = useState(false), [version, setVersion] = useState(0);
 const heading = useNameHeading(`${mode}-${revealed}`);
 const m = tidy(mascot), p = tidy(pasta);
 const generated = [`DJ ${m} ${p}`, `DJ ${p} ${m}`, `${m} ${p} 3000`, `DJ ${m} al ${p}`, `MC ${p} ${m}`, `${m} & the ${p}`][version % 6].slice(0, 64);
 const canContinue = mode === 'enter' ? !!tidy(ownName) : !!m && !!p;

 return <div className="name-flow">
  <form className={`name-card afterhours-name-card${revealed ? ' name-reveal' : ''}`} onSubmit={event => {
   event.preventDefault();
   if (!canContinue) return;
   if (mode === 'enter') onAccept(tidy(ownName));
   else if (revealed) onAccept(generated);
   else { setVersion(0); setRevealed(true); }
  }}>
   <p className="experience-kicker">{revealed ? 'PLEASE WELCOME TO THE BOOTH' : 'YOUR NAME · AFTERHOURS'}</p>
   <h1 ref={heading} tabIndex={-1}>{revealed ? generated : <>Your name.<br/><em>Your call.</em></>}</h1>
   {revealed ? <>
    <p>From the cafeteria to the club. Your next set has a name.</p>
    <div className="experience-actions">
     <button type="button" onClick={() => setRevealed(false)}>← Back</button>
     <button type="button" onClick={() => setVersion(v => v + 1)}>↻ Give me another</button>
     <button type="button" onClick={() => { setOwnName(generated); setRevealed(false); setMode('enter'); }}>Edit this name</button>
     <button className="experience-primary">Use this name →</button>
    </div>
   </> : <>
    <p>Bring your DJ name, or let a mascot and a bowl of pasta do the talking.</p>
    <div className="name-choice" role="group" aria-label="How would you like to choose your DJ name?">
     <button type="button" aria-pressed={mode === 'enter'} onClick={() => setMode('enter')}>Enter my name</button>
     <button type="button" aria-pressed={mode === 'create'} onClick={() => setMode('create')}>Create a name</button>
    </div>
    {mode === 'enter' ? <label>Your name or DJ name<input required maxLength={64} autoComplete="off" value={ownName} onChange={event => setOwnName(event.target.value)} placeholder="Andrew, DJ Misawa…"/></label> : <>
     <div className="name-ingredients">
      <label>High school mascot<input required maxLength={24} autoComplete="off" value={mascot} onChange={event => setMascot(event.target.value)} placeholder="Tiger, Bulldog, Falcon…"/></label>
      <label>Favorite type of pasta<input required maxLength={24} autoComplete="off" value={pasta} onChange={event => setPasta(event.target.value)} placeholder="Rigatoni, Ravioli, Farfalle…"/></label>
     </div>
     <p>Any mascot will do. The less sensible the combination, the better.</p>
    </>}
    <div className="experience-actions"><button className="experience-primary" disabled={!canContinue}>{mode === 'enter' ? 'Continue to music →' : 'Make my DJ name →'}</button></div>
   </>}
  </form>
  <SkipName djName={djName} onSkip={onSkip}/>
 </div>;
}

function KidsNameFlow({ djName, onAccept, onSkip }: NameProps) {
 const [name, setName] = useState(''), [favorite, setFavorite] = useState(''), [version, setVersion] = useState(0), [step, setStep] = useState(0);
 const heading = useNameHeading(step);
 const n = tidy(name) || 'Disco', f = tidy(favorite) || 'Fox';
 const currentName = [`DJ ${f} ${n}`, `DJ ${n} ${f}funk`, `${f} ${n} 3000`, `DJ Disco ${f}`, `${n} the ${f}`, `Captain ${f} ${n}`][version % 6].slice(0, 64);
 return <div className="name-flow">
  <div className="name-progress" aria-label={`DJ name step ${step + 1} of 3`}>{[1, 2, 3].map((number, i) => <span key={number} aria-current={i === step ? 'step' : undefined}>{number}</span>)}</div>
  <form className={`name-card ${step === 2 ? 'name-reveal' : ''}`} onSubmit={event => { event.preventDefault(); if (step < 2) setStep(step + 1); else onAccept(currentName); }}>
   <p className="experience-kicker">{step === 2 ? 'PLEASE WELCOME TO THE BOOTH' : `STEP ${step + 1} OF 3`}</p>
   <h1 ref={heading} tabIndex={-1}>{step === 0 ? <>Every DJ needs<br/><em>a name.</em></> : step === 1 ? <>Find your<br/><em>wild side.</em></> : currentName}</h1>
   {step === 0 && <><label>Your first name or nickname<input required maxLength={24} autoComplete="off" value={name} onChange={event => setName(event.target.value)} placeholder="What should we call you?"/></label><p>A nickname is perfect. This stays in your browser and is never sent to Astra.</p></>}
   {step === 1 && <><p>Pick an animal, a character, or your own inspiration.</p><div className="name-favorites">{favorites.map(([icon, label]) => <button type="button" aria-pressed={favorite === label} key={label} onClick={() => setFavorite(label)}><span aria-hidden="true">{icon}</span>{label}</button>)}</div><label>Or choose your own<input required maxLength={24} autoComplete="off" value={favorite} onChange={event => setFavorite(event.target.value)} placeholder="Night owl, dragon, disco…"/></label></>}
   {step === 2 && <p>Your name. Your taste. Your turn on the decks.</p>}
   <div className="experience-actions">
    {step > 0 && <button type="button" onClick={() => setStep(step - 1)}>← Back</button>}
    {step === 2 && <button type="button" onClick={() => setVersion(v => v + 1)}>↻ Give me another</button>}
    <button className="experience-primary" disabled={step === 0 ? !name.trim() : step === 1 ? !favorite.trim() : false}>{step === 2 ? "That's me — let's go →" : step === 1 ? 'Make my DJ name →' : 'Next →'}</button>
   </div>
  </form>
  <SkipName djName={djName} onSkip={onSkip}/>
 </div>;
}

export function DJNameFlow({ kids, ...props }: NameProps & { kids: boolean }) {
 return kids ? <KidsNameFlow {...props}/> : <AfterhoursNameFlow {...props}/>;
}
