/** Source amplitude, before mixer controls. Aligned fixture stems are summed. */
export function sourceEnvelope(buffers:AudioBuffer[],binsPerSecond=200){
 if(!buffers.length)return new Float32Array();
 const rate=buffers[0].sampleRate,length=buffers[0].length;
 const channels=buffers.map(b=>Array.from({length:b.numberOfChannels},(_,i)=>b.getChannelData(i)));
 const channelCount=Math.max(...channels.map(b=>b.length));
 const bins=new Float32Array(Math.ceil(length/rate*binsPerSecond));
 for(let i=0;i<length;i++){
  let peak=0;
  for(let c=0;c<channelCount;c++){
   let sum=0;for(const b of channels)sum+=b[Math.min(c,b.length-1)][i]??0;
   peak=Math.max(peak,Math.abs(sum));
  }
  const bin=Math.floor(i/rate*binsPerSecond);bins[bin]=Math.max(bins[bin],peak);
 }
 return bins;
}
