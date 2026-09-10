"""Read-only local audio checks; writes evidence, never certifies a musical grid.

Run with preparation venv: python scripts/validate_prepared.py TRACK_ID --start 16 --beats 32
The report contains private identifiers; its default destination is Git-ignored.
"""
import argparse
import json
from pathlib import Path

import numpy as np
import soundfile as sf
from prepare_tracks import ROOT, atomic, sha, valid_audio


def onset_check(path, start, bpm, beats):
    # Centered 32 ms STFT, 5 ms hop; broadband positive spectral flux.
    # Percussion attacks need not coincide with beats. This is an observed
    # agreement statistic, not a downbeat, phrase, or listening certificate.
    with sf.SoundFile(path) as source:
        sr = source.samplerate
        origin = max(0, start - .25)
        source.seek(int(origin * sr))
        audio = source.read(int((beats * 60 / bpm + .5) * sr), dtype='float32', always_2d=True)
    mono = audio.mean(axis=1)
    hop, size = round(sr * .005), round(sr * .032)
    frames = np.lib.stride_tricks.sliding_window_view(mono, size)[::hop]
    spectrum = np.abs(np.fft.rfft(frames * np.hanning(size), axis=1))
    flux = np.maximum(0, np.diff(spectrum, axis=0)).sum(axis=1)
    times = origin + (np.arange(len(flux)) * hop + size / 2 + hop) / sr
    peaks = np.flatnonzero((flux[1:-1] > flux[:-2]) & (flux[1:-1] >= flux[2:])) + 1
    peaks = peaks[flux[peaks] > np.quantile(flux, .60)]
    errors = []
    for target in start + np.arange(beats) * 60 / bpm:
        nearby = peaks[np.abs(times[peaks] - target) < .120]
        errors.append(float(times[nearby[np.argmax(flux[nearby])]] - target) if len(nearby) else None)
    measured = np.array([e for e in errors if e is not None])
    return {'method': 'broadband spectral flux; centered 32ms FFT, 5ms hop; strongest local peak within 120ms; 60th percentile threshold',
            'start': start, 'end': start + beats * 60 / bpm, 'bpm': bpm, 'beats': beats,
            'matched': len(measured), 'medianErrorMs': float(np.median(measured) * 1000) if len(measured) else None,
            'p90AbsoluteErrorMs': float(np.quantile(np.abs(measured), .9) * 1000) if len(measured) else None,
            'errorsSeconds': errors, 'musicalAlignmentVerified': False,
            'limitation': 'Onset agreement only; cannot establish beat-one/phrase identity or human musical compatibility.'}


def validate(ident, start, beats):
    folder = ROOT / 'prepared' / ident
    record = json.loads((folder / 'manifest.json').read_text())
    original, sr = valid_audio(folder / 'original.wav')
    files = {f['name']: sha(folder / f['name']) == f['sha256'] for f in record['files']}
    source_ok = sha(ROOT / 'originals' / record['sourceFile']) == record['sha256']
    names = record['stemNames']
    if names and set(names) != {'drums', 'bass', 'vocals', 'other'}:
        raise ValueError('Incomplete or unexpected stem set')
    if any(name + '.wav' not in files for name in names):
        raise ValueError('Stem hash missing from manifest')
    stems = [valid_audio(folder / (name + '.wav'))[0] for name in names]
    aligned = all(s.shape == original.shape for s in stems)
    if not all(files.values()) or not source_ok or not aligned:
        raise ValueError('Hash or decoded format/sample count mismatch')
    report = {'id': ident, 'preparationVersion': record['preparationVersion'], 'sourceHashValid': source_ok,
              'fileHashesValid': files, 'samples': len(original), 'sampleRate': sr, 'channels': 2,
              'stemsAvailable': len(stems) == 4, 'sampleCountsAligned': aligned if stems else None,
              'humanAudition': 'pending', 'originalPeak': float(np.max(np.abs(original)))}
    if stems:
        combined = sum(stems)
        scale = record['validation']['sharedScale']
        if not 0 < scale <= 1 or max(float(np.max(np.abs(s))) for s in stems + [combined]) > .95001:
            raise ValueError('Invalid common gain or recombination headroom')
        error = combined - original * scale
        # Correlation at coarse lags checks source-time origin, not per-stem phase.
        a = original[::32].mean(axis=1); b = combined[::32].mean(axis=1)
        lags = range(-20, 21)
        correlations = [float(np.dot(a[max(0, lag):len(a)+min(0, lag)], b[max(0, -lag):len(b)-max(0, lag)])) for lag in lags]
        report.update(sharedScale=scale, stemPeaks=[float(np.max(np.abs(s))) for s in stems],
                      recombinedPeak=float(np.max(np.abs(combined))), recombinationErrorRms=float(np.sqrt(np.mean(error ** 2))),
                      recombinationCorrelation=float(np.corrcoef(a, b)[0, 1]),
                      bestCoarseOriginLagMs=list(lags)[int(np.argmax(correlations))],
                      originCheckResolutionMs=1, originCheckRangeMs=20)
    if start is not None:
        report['onsets'] = onset_check(folder / ('drums.wav' if stems else 'original.wav'), start, record['bpm'], beats)
        report['onsets']['audioSource'] = 'drums' if stems else 'original'
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('track_id')
    parser.add_argument('--start', type=float)
    parser.add_argument('--beats', type=int, default=32)
    args = parser.parse_args()
    if not args.track_id.startswith('local-') or len(args.track_id) != 70 or any(c not in '0123456789abcdef' for c in args.track_id[6:]):
        parser.error('Invalid content-hash track ID')
    if args.start is not None and (args.start < 0 or not np.isfinite(args.start)):
        parser.error('Start must be non-negative and finite')
    if not 4 <= args.beats <= 256:
        parser.error('Beats must be 4–256')
    result = validate(args.track_id, args.start, args.beats)
    output = ROOT / 'validation'
    output.mkdir(exist_ok=True)
    atomic(output / (args.track_id + '.json'), result)
    print(json.dumps(result, indent=2))
