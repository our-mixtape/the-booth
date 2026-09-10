"""Synthetic regressions for measured rhythm evidence (no private audio needed)."""
import json
import tempfile
import unittest
from pathlib import Path

import numpy as np
import soundfile as sf
import validate_prepared as validator
from prepare_tracks import sha
from validate_prepared import onset_check


class RhythmEvidenceTests(unittest.TestCase):
    def test_shifted_attacks_are_reported_not_certified(self):
        sr = 32000
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'impulses.wav'
            for offset in [0, -.05, .07]:
                audio = np.zeros((sr * 19, 2), dtype=np.float32)
                for beat in range(32):
                    at = int((1 + beat * .5 + offset) * sr)
                    audio[at:at + 64] = np.hanning(64)[:, None] * .5
                sf.write(path, audio, sr, subtype='FLOAT')
                result = onset_check(path, 1, 120, 32)
                self.assertEqual(result['matched'], 32)
                self.assertAlmostEqual(result['medianErrorMs'], offset * 1000, delta=15)
                self.assertFalse(result['musicalAlignmentVerified'])

    def test_changed_original_cannot_pass_readiness(self):
        with tempfile.TemporaryDirectory() as directory:
            previous = validator.ROOT
            validator.ROOT = root = Path(directory)
            try:
                (root / 'originals').mkdir()
                folder = root / 'prepared' / 'test'
                folder.mkdir(parents=True)
                original = folder / 'original.wav'
                sf.write(original, np.zeros((320, 2)), 32000, subtype='FLOAT')
                source = root / 'originals' / 'source.wav'
                source.write_bytes(original.read_bytes())
                record = dict(sourceFile='source.wav', sha256=sha(source),
                              files=[dict(name='original.wav', sha256=sha(original))], stemNames=[])
                (folder / 'manifest.json').write_text(json.dumps(record))
                source.write_bytes(b'replaced content')
                with self.assertRaisesRegex(ValueError, 'Hash'):
                    validator.validate('test', None, 32)
            finally:
                validator.ROOT = previous

    def test_silence_does_not_match_beats(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'silent.wav'
            sf.write(path, np.zeros((32000 * 19, 2)), 32000, subtype='FLOAT')
            result = onset_check(path, 1, 120, 32)
            self.assertEqual(result['matched'], 0)
            self.assertIsNone(result['medianErrorMs'])


if __name__ == '__main__':
    unittest.main()
