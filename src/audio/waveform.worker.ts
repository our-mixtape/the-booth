import {sourceEnvelope} from './waveform';
self.onmessage=(event:MessageEvent<{id:number;buffers:{channels:Float32Array[];sampleRate:number}[]}>)=>{
 const buffers=event.data.buffers.map(b=>({sampleRate:b.sampleRate,length:b.channels[0].length,numberOfChannels:b.channels.length,getChannelData:(i:number)=>b.channels[i]}) as AudioBuffer);
 const peaks=sourceEnvelope(buffers);self.postMessage({id:event.data.id,peaks});
};
