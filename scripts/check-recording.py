"""Inspect encoded video/system-audio evidence. Requires ffmpeg and ffprobe.

Usage: python3 scripts/check-recording.py recording.mp4 > recording-check.json
Signal measurements do not establish musical quality or human audition.
"""
import array
import hashlib
import json
import math
from pathlib import Path
import subprocess
import sys

path = Path(sys.argv[1])
probe = json.loads(subprocess.check_output([
    'ffprobe', '-v', 'error', '-show_entries',
    'format=duration,size:stream=codec_type,codec_name,width,height,duration,sample_rate,channels',
    '-of', 'json', str(path),
]))
assert any(s['codec_type'] == 'video' for s in probe['streams']), 'Missing video'
assert any(s['codec_type'] == 'audio' for s in probe['streams']), 'Missing audio'
samples = array.array('f')
samples.frombytes(subprocess.check_output([
    'ffmpeg', '-v', 'error', '-i', str(path), '-vn', '-ac', '2', '-ar', '48000',
    '-f', 'f32le', '-',
]))
if sys.byteorder != 'little':
    samples.byteswap()
assert samples and all(math.isfinite(x) for x in samples), 'Invalid audio samples'
def rms(values):
    return math.sqrt(sum(x * x for x in values) / len(values))
peak = max(abs(x) for x in samples)
level = rms(samples)
assert level > 0.00001, 'No meaningful encoded audio signal'
assert peak < 1, 'Encoded audio reaches full scale; inspect for clipping'
print(json.dumps({
    'file': path.name,
    'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
    'probe': probe,
    'decodedStereoSampleRate': 48000,
    'decodedAudioSeconds': len(samples) / 96000,
    'peak': peak,
    'rms': level,
    'rmsDBFS': 20 * math.log10(level),
    'oneSecondRms': [rms(samples[i:i + 96000]) for i in range(0, len(samples), 96000)],
    'scope': 'Encoded audio signal check; not human audition or proof of glitch-free playback',
}, indent=2))
