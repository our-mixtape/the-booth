import { ExperienceSwitch } from './experience/Experience';
import type { ExperienceRoute } from './experience/crate';
import { AccountButton } from './auth/Account';
export function SiteHeader({route}:{route:ExperienceRoute|null}){
 const landing=!route||(route.audience==='advanced'&&route.screen==='landing');
 return <header className={`site-header${landing?' site-header-home':''}`}><a className="wordmark" href="#enter">mixtape <span>the booth</span></a><span className="edition">AN EXPERIMENT IN PLAY<br/>VOL. 001 / 2026</span><nav aria-label="Main navigation">{route?<><a href={`#${route.audience}/session`}>Your session</a><a href={`#${route.audience}/play`}>Play</a><a className="entry-link" href={`#${route.audience}/name`}>DJ name ↗</a></>:<><a href="#play">The experience</a><a href="#assist">Astra, backstage</a><a className="entry-link" href="#advanced/name">Enter the booth ↗</a></>}<ExperienceSwitch route={route}/><AccountButton/></nav></header>;
}
export function Hero(){return <section className="hero afterhours-hero" id="enter">
 <div className="afterhours-glow" aria-hidden="true"/>
 <img className="hero-rig" src="/art/booth-illustration.svg" alt=""/>
 <div className="afterhours-floor" aria-hidden="true"/>
 <div className="hero-copy">
  <p className="eyebrow hero-kicker">AFTERHOURS · ASTRA HACKATHON NYC · VOL. 001</p>
  <h1>Step into<br/><em>the mix.</em></h1>
  <p className="hero-description">A playable DJ booth in your browser. Two setups, one live mix, and a companion who helps when you ask.</p>
  <div className="afterhours-entry"><a className="ink-link" href="#advanced/name">Enter the booth <span>↗</span></a><a className="afterhours-kids-link" href="#kids">Explore the Kids experience →</a></div>
  <small>Play freely. Sign in for Astra.</small>
 </div>
 <div className="hero-bottom"><span>LOCAL TRACKS<br/>SOUND STARTS WHEN YOU DO</span><a href="#play">EXPLORE THE BOOTH ↓</a><span>TWO SETUPS. ONE MIX.<br/>ALWAYS YOUR HANDS.</span></div>
</section>;}
export function Together(){return <section className="together" id="together"><div><p className="eyebrow">04 / THE OTHER SIDE OF MIXTAPE</p><h2>Good music.<br/><em>Better together.</em></h2><p>Mixtape’s charity jukebox brings song requests and giving to the dance floor. The Booth explores the other side of that feeling: making the mix yourself.</p><a className="paper-link" href="https://www.ourmixtape.org" target="_blank" rel="noopener noreferrer">Meet the charity jukebox ↗</a></div><div className="cassette-card" aria-hidden="true"><p>IN THE MIXTAPE WORLD / GOOD MUSIC, SHARED</p><div className="cassette"><div className="cassette-label"><span>Good people.<br/>Groovy tunes.</span><b>B</b><div className="tape-window"><i>✳</i><i>✳</i></div></div><small>GOOD PEOPLE / GROOVY TUNES / GREAT IMPACT</small></div><p>REQUEST A SONG. MAKE SOME GOOD.</p></div></section>;}
export function SiteFooter({compact=false}:{compact?:boolean}){
 return <>
  {!compact&&<section className="endnote"><p>Enough looking.<br/><em>Find your first mix.</em></p><a className="ink-link" href="#play">Back to the booth ↗</a></section>}
  <footer className={`site-footer${compact?' site-footer-compact':''}`}>
   <div className="footer-home"><span>MIXTAPE — THE BOOTH<br/>{compact?'GOOD MUSIC, SHARED.':'A PLAYABLE EXPERIMENT / 2026'}</span><a className="mixtape-home" href="https://ourmixtape.org" target="_blank" rel="noopener noreferrer" aria-label="Visit ourmixtape.org (opens in a new tab)">ourmixtape.org ↗</a></div>
   {!compact&&<><p className="footer-wordmark" aria-hidden="true">mixtape<span>✳</span></p><div><span>BUILT TO EXPLORE THE FEEL.</span><span>LOCAL AUDIO · HUMAN-OWNED CONTROLS</span></div></>}
  </footer>
 </>;
}
