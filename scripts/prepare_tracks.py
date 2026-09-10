"""Original local preparation adapter. Audio stays under ignored local-tracks/."""
import argparse, hashlib, json, os, subprocess, time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]/'local-tracks'
EXTENSIONS={'.wav','.mp3','.m4a','.aiff','.aif','.flac','.ogg'}
def sha(path):
 h=hashlib.sha256()
 with path.open('rb') as f:
  for block in iter(lambda:f.read(1024*1024),b''):h.update(block)
 return h.hexdigest()
def atomic(path,data):
 temp=path.with_suffix('.tmp');temp.write_text(json.dumps(data,indent=2));temp.replace(path)
def run(args):
 subprocess.run(args,check=True,stdout=subprocess.DEVNULL)
def valid_audio(path):
 import soundfile as sf
 import numpy as np
 data,rate=sf.read(path,dtype='float32',always_2d=True)
 if rate!=32000 or data.shape[1]!=2 or not len(data) or not np.isfinite(data).all():raise ValueError('Invalid audio output')
 return data,rate

def scan():
 for source in sorted((ROOT/'originals').iterdir()):
  if not source.is_file() or source.suffix.lower() not in EXTENSIONS:continue
  digest=sha(source);ident='local-'+digest;folder=ROOT/'prepared'/ident;folder.mkdir(parents=True,exist_ok=True);manifest=folder/'manifest.json'
  if manifest.exists():
   old=json.loads(manifest.read_text())
   if all((folder/f['name']).exists() and sha(folder/f['name'])==f['sha256'] for f in old['files']):continue
  try:
   temp=folder/'original.tmp.wav'
   run(['ffmpeg','-nostdin','-v','error','-y','-i',str(source),'-vn','-ar','32000','-ac','2','-c:a','pcm_f32le',str(temp)])
   data,rate=valid_audio(temp);duration=len(data)/rate
   if duration>600:raise ValueError('Track exceeds 10 minute playback limit')
   temp.replace(folder/'original.wav')
   record={'id':ident,'title':source.stem[:100],'duration':duration,'sampleRate':rate,'channels':2,'preparationVersion':1,'sourceOrigin':0,'cues':[0],'provenance':'local original · analysis unknown','capabilities':['original-playable'],'sha256':digest,'files':[{'name':'original.wav','sha256':sha(folder/'original.wav')}],'stemNames':[],'status':'original-ready','sourceFile':source.name}
   atomic(manifest,record);print('Original ready:',source.name,flush=True)
  except Exception as e:print('Original failed:',source.name,str(e),flush=True)

def separate(ident):
 import numpy as np
 import soundfile as sf
 folder=ROOT/'prepared'/ident;path=folder/'manifest.json';record=json.loads(path.read_text())
 record['status']='running';record.pop('error',None);atomic(path,record);started=time.time()
 try:
  # Full source, one deterministic shift, CPU concurrency bounded to leave room for playback.
  source=ROOT/'originals'/record['sourceFile']
  if sha(source)!=record['sha256']:raise ValueError('Source content changed; scan the replacement first')
  if any(sha(folder/f['name'])!=f['sha256'] for f in record['files']):raise ValueError('Prepared files failed hash verification')
  import torch
  from demucs.pretrained import get_model
  from demucs.apply import apply_model
  from demucs.separate import load_track
  torch.set_num_threads(2)
  model=get_model('htdemucs').cpu().eval()
  audio=load_track(source,model.audio_channels,model.samplerate)
  reference=audio.mean(0);mean=reference.mean();std=reference.std()
  if float(std)<1e-8:raise ValueError('Source is silent')
  with torch.no_grad():
   separated=apply_model(model,((audio-mean)/std)[None],device='cpu',shifts=0,split=True,overlap=.25,progress=True,num_workers=0)[0]*std+mean
  work=folder/'work'/'htdemucs'/source.stem;work.mkdir(parents=True,exist_ok=True)
  for name,samples in zip(model.sources,separated):sf.write(work/(name+'.wav'),samples.cpu().numpy().T,model.samplerate,subtype='FLOAT')
  stems=[];names=['drums','bass','vocals','other']
  for name in names:
   target=folder/(name+'.tmp.wav')
   run(['ffmpeg','-nostdin','-v','error','-y','-i',str(folder/'work'/'htdemucs'/source.stem/(name+'.wav')),'-ar','32000','-ac','2','-c:a','pcm_f32le',str(target)])
   data,rate=valid_audio(target);stems.append(data)
  original,_=valid_audio(folder/'original.wav')
  if any(s.shape!=original.shape for s in stems):raise ValueError('Stem sample counts do not match the original')
  combined=sum(stems);peak=float(np.max(np.abs(combined)));individual=max(float(np.max(np.abs(s))) for s in stems)
  # Same scale on every stem, never independently normalize them.
  scale=min(1,.95/max(peak,individual,1e-9))
  files=[record['files'][0]]
  for name,data in zip(names,stems):
   temp=folder/(name+'.tmp.wav');sf.write(temp,data*scale,rate,subtype='FLOAT');temp.replace(folder/(name+'.wav'));files.append({'name':name+'.wav','sha256':sha(folder/(name+'.wav'))})
  record.update(files=files,stemNames=names,status='stems-ready',capabilities=list(dict.fromkeys(record.get('capabilities',[])+['original-playable','stems-available'])),provenance='Demucs htdemucs · imported metadata retained, alignment separately checked',preparationVersion=record['preparationVersion']+1,validation={'samples':len(original),'channels':2,'sampleRate':rate,'recombinedPeakBeforeScale':peak,'sharedScale':scale,'seconds':time.time()-started})
  atomic(path,record);print('Stems validated:',record['title'],record['validation'],flush=True)
 except Exception as e:
  record['status']='failed';record['error']=str(e)[-500:];atomic(path,record);raise
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--scan',action='store_true');p.add_argument('--separate');a=p.parse_args()
 if a.scan:scan()
 if a.separate:
  if not a.separate.startswith('local-') or len(a.separate)!=70 or any(c not in '0123456789abcdef' for c in a.separate[6:]):raise ValueError('Invalid track ID')
  separate(a.separate)
