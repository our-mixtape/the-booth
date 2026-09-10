import type { DeckId } from './domain/session';

// One deck identity across the DOM labels, waveform canvas and 3D player displays.
export const deckColors = {
 A:'#c3c9ff', B:'#86cee0', C:'#8f9dff', D:'#d9b5ed',
} satisfies Record<DeckId,string>;

export const boothPalette = {
 background:'#08080b', surface:'#10101a', alternateSurface:'#181923',
 line:'#303246', strongLine:'#676d91', text:'#f3f3f5', muted:'#b4b7cc',
 accent:'#aab5ff', cue:'#e4c491',
 body:'#1b1d2b', face:'#2a2d40', metal:'#aeb5cd', print:'#dfe3f5',
};
