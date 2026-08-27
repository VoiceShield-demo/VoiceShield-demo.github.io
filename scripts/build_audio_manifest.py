#!/usr/bin/env python3
"""Rebuild the four-sample, ten-method audio manifest."""

from __future__ import annotations

import hashlib
import json
import wave
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
AUDIO = ROOT / "audio"
OUTPUT = ROOT / "audio-manifest.json"
METHODS = [
    ("original", "Original", "sample-{sample}-original.wav"),
    ("mcadams", "McAdams", "sample-{sample}-mcadams.wav"),
    ("antifake", "AntiFake", "sample-{sample}-antifake.wav"),
    ("safespeech", "SafeSpeech", "sample-{sample}-safespeech.wav"),
    ("pop", "POP", "sample-{sample}-pop.wav"),
    ("e2e", "E2E-VGuard", "sample-{sample}-e2e.wav"),
    ("voiceblock", "VoiceBlock", "sample-{sample}-voiceblock.wav"),
    ("rovo", "RoVo", "sample-{sample}-rovo.wav"),
    ("voiceshield", "VoiceShield", "sample-{sample}-voiceshield.wav"),
    (
        "voiceshield_rt",
        "VoiceShield_RT",
        "sample-{sample}-voiceshield-rt.wav",
    ),
]


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def describe(path: Path) -> dict[str, object]:
    with wave.open(str(path), "rb") as reader:
        sample_rate = reader.getframerate()
        frames = reader.getnframes()
        channels = reader.getnchannels()
        bit_depth = reader.getsampwidth() * 8
    return {
        "path": path.relative_to(ROOT).as_posix(),
        "bytes": path.stat().st_size,
        "sample_rate_hz": sample_rate,
        "channels": channels,
        "bit_depth": bit_depth,
        "frames": frames,
        "duration_seconds": round(frames / sample_rate, 3),
        "sha256": sha256(path),
    }


def main() -> None:
    samples = []
    for number in range(1, 5):
        sample = f"{number:02d}"
        clips = {}
        for key, _, pattern in METHODS:
            path = AUDIO / pattern.format(sample=sample)
            if not path.is_file():
                raise FileNotFoundError(path)
            clips[key] = describe(path)
        samples.append({"id": sample, "clips": clips})

    manifest = {
        "artifact": "VoiceShield anonymous supplementary material",
        "sample_selection": "Four selected LibriTTS utterances (source IDs 6, 1, 4, and 10)",
        "methods": [
            {"key": key, "label": label}
            for key, label, _ in METHODS
        ],
        "format": (
            "Mono, 16-bit PCM WAV. Each method retains its native sampling "
            "rate and method-produced duration."
        ),
        "samples": samples,
    }
    OUTPUT.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {OUTPUT} with {len(samples)} samples and {len(METHODS)} methods")


if __name__ == "__main__":
    main()
