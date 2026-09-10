"""Import explicit Rekordbox metadata without guessing between library entries."""
import argparse, hashlib, json, math
from pathlib import Path
from urllib.parse import urlparse,unquote
import xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
def number(value):
 n=float(value)
 if not math.isfinite(n):raise ValueError('Non-finite metadata')
 return n

def musical(track):
 grid=[];marks=[]
 for c in track:
  if c.tag=='TEMPO':
   at=number(c.get('Inizio'));bpm=number(c.get('Bpm'));beat=int(c.get('Battito'));meter=c.get('Metro','')
   if at<0 or not 0<bpm<=500 or not 1<=beat<=32:raise ValueError('Invalid beat anchor')
   grid.append({'at':at,'bpm':bpm,'beat':beat,'meter':meter})
  elif c.tag=='POSITION_MARK':
   mark={'name':c.get('Name','')[:100],'type':int(c.get('Type','0')),'at':number(c.get('Start')),'number':int(c.get('Num','-1'))}
   if c.get('End') is not None:mark['end']=number(c.get('End'))
   marks.append(mark)
 return {'bpm':number(track.get('AverageBpm','0')),'key':track.get('Tonality','')[:30],'grid':sorted(grid,key=lambda g:g['at']),'marks':marks}

def import_xml(path):
 raw=path.read_bytes()
 if len(raw)>30_000_000 or b'<!DOCTYPE' in raw.upper() or b'<!ENTITY' in raw.upper():raise ValueError('Unsupported XML document')
 tracks=ET.fromstring(raw).findall('./COLLECTION/TRACK');report={'exportTracks':len(tracks),'matched':[],'review':[]};digest=hashlib.sha256(raw).hexdigest()
 for manifest in sorted((ROOT/'local-tracks/prepared').glob('*/manifest.json')):
  m=json.loads(manifest.read_text());source=ROOT/'local-tracks/originals'/m['sourceFile'];size=source.stat().st_size
  candidates=[t for t in tracks if Path(unquote(urlparse(t.get('Location','')).path)).name==source.name]
  exact=[t for t in candidates if int(t.get('Size','0'))==size]
  if len(exact)!=1:
   report['review'].append({'file':source.name,'reason':'conflicting entries' if len(exact)>1 else 'no exact size match','candidates':[{'trackId':t.get('TrackID'),'title':t.get('Name'),'size':t.get('Size'),'bpm':t.get('AverageBpm'),'key':t.get('Tonality'),'tempoAnchors':len(t.findall('TEMPO')),'markers':len(t.findall('POSITION_MARK'))} for t in (exact or candidates)]});continue
  t=exact[0];meta=musical(t)
  if abs(number(t.get('TotalTime','0'))-m['duration'])>2:
   report['review'].append({'file':source.name,'reason':'duration mismatch'});continue
  meta.update(trackId=t.get('TrackID'),source='rekordbox-xml',exportSha256=digest,match='unique filename + byte size + duration',alignmentVerified=False)
  m['rekordbox']=meta
  if meta['bpm']>0:m['bpm']=meta['bpm']
  m['capabilities']=list(dict.fromkeys(m['capabilities']+['rekordbox-metadata']))
  temporary=manifest.with_suffix('.tmp');temporary.write_text(json.dumps(m,indent=2));temporary.replace(manifest)
  report['matched'].append({'file':source.name,'bpm':meta['bpm'],'key':meta['key'],'anchors':len(meta['grid']),'markers':len(meta['marks'])})
 out=ROOT/'local-tracks/rekordbox-import-report.json';out.write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2));return report
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('xml',type=Path);a=p.parse_args();import_xml(a.xml)
