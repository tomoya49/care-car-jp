"""全体の流れ: 同意確認 → 分割 → Wan2.2-Animate で人物を置き換え → 結合 → 音声・AI表示を付けて出力。"""

from __future__ import annotations

import datetime as dt
import json
from dataclasses import asdict
from pathlib import Path

from . import __version__, media
from .consent import Consent
from .wan_animate import WanConfig, replace_person


def run(
    *,
    video: Path,
    person: Path,
    out: Path,
    consent: Consent,
    wan: WanConfig,
    work_dir: Path,
    segment_seconds: float | None = None,
    label: str | None = None,
) -> Path:
    media.require_ffmpeg()
    wan.check()
    if not person.is_file():
        raise FileNotFoundError(f"人物の写真が見つかりません: {person}")

    info = media.probe(video)
    fps = max(1, round(info.fps))
    work_dir.mkdir(parents=True, exist_ok=True)

    segments = media.plan_segments(info.duration, segment_seconds)
    parts: list[Path] = []
    for i, (start, length) in enumerate(segments):
        seg_dir = work_dir / f"seg{i:03d}"
        seg_dir.mkdir(exist_ok=True)
        print(f"[{i + 1}/{len(segments)}] {start:.1f}秒〜{start + length:.1f}秒", flush=True)

        src = video
        if len(segments) > 1:
            src = seg_dir / "src.mp4"
            media.cut_segment(video, src, start, length)

        generated = replace_person(wan, src, person, seg_dir, seg_dir / "generated.mp4", fps)

        factor = media.retime_factor(media.probe(generated).duration, length)
        if factor:
            fixed = seg_dir / "generated_retimed.mp4"
            media.retime_video(generated, fixed, factor)
            generated = fixed
        parts.append(generated)

    joined = work_dir / "joined.mp4"
    media.concat(parts, joined)

    out.parent.mkdir(parents=True, exist_ok=True)
    media.finalize(joined, video, out, has_audio=info.has_audio, label=label)
    _write_provenance(out, video=video, person=person, consent=consent, wan=wan)
    return out


def _write_provenance(out: Path, *, video: Path, person: Path, consent: Consent, wan: WanConfig) -> None:
    """何から・誰の同意で作ったかを出力の横に JSON で残す。"""
    record = {
        "tool": f"motion-swap {__version__}",
        "model": "Wan2.2-Animate-14B (replacement mode)",
        "created_at": dt.datetime.now().astimezone().isoformat(timespec="seconds"),
        "ai_generated": True,
        "inputs": {
            "video": {"file": video.name, "sha256": media.sha256_file(video)},
            "person_image": {"file": person.name, "sha256": media.sha256_file(person)},
        },
        "consent": {
            "performer": consent.performer.name,
            "subject": consent.subject.name,
            "purpose": consent.purpose,
            "expires_on": consent.expires_on.isoformat() if consent.expires_on else None,
            "record_sha256": consent.sha256,
        },
        "settings": {
            "resolution": list(wan.resolution),
            "low_vram": wan.low_vram,
            "relighting": wan.relighting,
            "seed": wan.seed,
        },
        "output_sha256": media.sha256_file(out),
    }
    out.with_suffix(out.suffix + ".provenance.json").write_text(
        json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
