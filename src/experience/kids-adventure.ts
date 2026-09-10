import type { AudioEngine } from '../audio/engine';
import type { DeckId } from '../domain/session';
type Snapshot = ReturnType<AudioEngine['snapshot']>;
export type Adventure = { stage: number; since: number; identity: string; filters: { A: number; B: number }; blend: number; observations: string[] };
const identity = (snapshot: Snapshot) => ['A', 'B'].map(id => { const track = snapshot.decks[id as DeckId].track; return `${track.id}:${track.preparationVersion}`; }).join('|');
export function beginAdventure(snapshot: Snapshot, now: number, stage = 0, observations: string[] = []): Adventure {
 return { stage, since: now, identity: identity(snapshot), filters: { A: snapshot.decks.A.filter, B: snapshot.decks.B.filter }, blend: snapshot.crossfader, observations };
}
// Observations require a fresh manual command AND measured channel output.
// This is a local listening activity, not an Astra response or a musical-quality score.
export function advanceAdventure(activity: Adventure, snapshot: Snapshot, now: number, levels: { A: number; B: number }): Adventure {
 if (identity(snapshot) !== activity.identity) return beginAdventure(snapshot, now);
 if (activity.stage >= 3) return activity;
 const events = snapshot.history.filter(event => event.at > activity.since && event.origin !== 'agent');
 const audible = (id: 'A' | 'B') => snapshot.decks[id].playing && levels[id] > .002;
 let observation = '';
 if (activity.stage === 0) {
  const event = events.find(({ command }) => typeof command !== 'string' && command.type === 'play' && (command.deck === 'A' || command.deck === 'B') && audible(command.deck));
  if (event && typeof event.command !== 'string' && 'deck' in event.command) observation = `You started song ${event.command.deck}. The sound is moving!`;
 } else if (activity.stage === 1) {
  const event = events.find(({ command }) => typeof command !== 'string' && command.type === 'filter' && (command.deck === 'A' || command.deck === 'B') && audible(command.deck) && Math.abs(snapshot.decks[command.deck].filter - activity.filters[command.deck]) >= .15);
  if (event && typeof event.command !== 'string' && 'deck' in event.command) observation = `You changed the tone of song ${event.command.deck} while it played.`;
 } else if (events.some(({ command }) => typeof command !== 'string' && command.type === 'crossfader') && Math.abs(snapshot.crossfader - activity.blend) >= .2 && audible('A') && audible('B') && snapshot.decks.A.track.id !== snapshot.decks.B.track.id) {
  observation = 'You moved the mix slider with both songs sounding together.';
 }
 return observation ? beginAdventure(snapshot, now, activity.stage + 1, [...activity.observations, observation]) : activity;
}
