import {readdir,readFile,stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../local-tracks/prepared/',import.meta.url));
const idPattern=/^local-[a-f0-9]{64}$/;
export async function libraryRoute(req,res){
 if(!req.url?.startsWith('/api/library')&&req.url!=='/api/exercise')return false;
 const reply=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
 if(req.method!=='GET'){reply(405,{error:'Read only'});return true;}
 try{
  let selection;
  try{selection=JSON.parse(await readFile(`${root}/../demo-selection.json`,'utf8')).trackIds;if(!Array.isArray(selection)||selection.some(id=>typeof id!=='string'||!idPattern.test(id)))throw new Error('Invalid demo selection');}catch(error){if(error.code!=='ENOENT')throw error;}
  const ids=(await readdir(root)).filter(id=>idPattern.test(id)&&(!selection||selection.includes(id)));
  if(req.url==='/api/library'||req.url==='/api/exercise'){
   const tracks=[];
   for(const id of ids){try{
    const m=JSON.parse(await readFile(`${root}/${id}/manifest.json`,'utf8'));
    if(m.id!==id||!m.files?.some(f=>f.name==='original.wav'))continue;
    const url=name=>`/api/library/${id}/${name}`;
    tracks.push({id,title:m.title,rhythmVerification:m.rhythmVerification,bpm:m.bpm,rekordbox:m.rekordbox,duration:m.duration,sampleRate:m.sampleRate,channels:m.channels,preparationVersion:m.preparationVersion,sourceOrigin:0,cues:[0],provenance:m.provenance,capabilities:m.capabilities,sha256:m.sha256,original:url('original.wav'),originalSha256:m.files.find(f=>f.name==='original.wav').sha256,stems:m.status==='stems-ready'?m.stemNames.map(name=>({name,file:url(name+'.wav'),sha256:m.files.find(f=>f.name===name+'.wav').sha256})):[],status:m.status});
   }catch{/* incomplete preparation isn't advertised */}}
   if(req.url==='/api/exercise'){const exercise=JSON.parse(await readFile(`${root}/../exercise-pair.json`,'utf8'));const pair=exercise.trackIds.map(id=>tracks.find(t=>t.id===id));if(pair.length!==2||pair.some(t=>!t))throw new Error('Exercise pair unavailable');reply(200,{tracks:pair,positions:exercise.positions,rates:exercise.rates});}else reply(200,{tracks});return true;
  }
  const match=req.url.match(/^\/api\/library\/(local-[a-f0-9]{64})\/(original|drums|bass|vocals|other)\.wav$/);
  if(!match||!ids.includes(match[1])){reply(404,{error:'Unknown audio'});return true;}
  const file=`${root}/${match[1]}/${match[2]}.wav`,m=JSON.parse(await readFile(`${root}/${match[1]}/manifest.json`,'utf8'));
  if(!m.files.some(f=>f.name===match[2]+'.wav')||(match[2]!=='original'&&m.status!=='stems-ready')){reply(404,{error:'Audio not ready'});return true;}
  const info=await stat(file);res.writeHead(200,{'Content-Type':'audio/wav','Content-Length':info.size});createReadStream(file).on('error',()=>res.destroy()).pipe(res);return true;
 }catch{reply(503,{error:'Local library unavailable. Run preparation first.'});return true;}
}
