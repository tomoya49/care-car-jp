"""ffmpeg まわり（GPU不要）。"""

from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path

AI_NOTICE = "AI-generated: person appearance replaced with motion-swap (Wan2.2-Animate)"


class MediaError(RuntimeError):
    pass


@dataclass(frozen=True)
class VideoInfo:
    duration: float
    width: int
    height: int
    fps: float
    has_audio: bool


def require_ffmpeg() -> None:
    for tool in ("ffmpeg", "ffprobe"):
        if shutil.which(tool) is None:
            raise MediaError(f"{tool} が見つかりません。ffmpeg をインストールしてください")


def _run(cmd: list[str]) -> str:
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise MediaError(f"失敗: {' '.join(cmd)}\n{proc.stderr[-2000:]}")
    return proc.stdout


def probe(path: Path) -> VideoInfo:
    out = _run([
        "ffprobe", "-v", "error", "-print_format", "json",
        "-show_format", "-show_streams", str(path),
    ])
    data = json.loads(out)
    video = next((s for s in data["streams"] if s["codec_type"] == "video"), None)
    if video is None:
        raise MediaError(f"映像トラックがありません: {path}")
    num, den = video.get("r_frame_rate", "0/1").split("/")
    fps = float(num) / float(den) if float(den) else 0.0
    return VideoInfo(
        duration=float(data["format"].get("duration", 0.0)),
        width=int(video["width"]),
        height=int(video["height"]),
        fps=fps,
        has_audio=any(s["codec_type"] == "audio" for s in data["streams"]),
    )


def plan_segments(duration: float, segment_seconds: float | None) -> list[tuple[float, float]]:
    """(開始秒, 長さ秒) の一覧。segment_seconds が None なら分割しない。

    最後の区切りが極端に短くなる（1秒未満）ときは、1つ前の区切りにくっつける。
    """
    if duration <= 0:
        raise MediaError("動画の長さが0です")
    if not segment_seconds or segment_seconds >= duration:
        return [(0.0, duration)]
    if segment_seconds <= 0:
        raise MediaError("segment_seconds は正の数にしてください")
    segments: list[tuple[float, float]] = []
    start = 0.0
    while start < duration - 1e-6:
        length = min(segment_seconds, duration - start)
        segments.append((start, length))
        start += length
    if len(segments) > 1 and segments[-1][1] < 1.0:
        last_start, last_len = segments.pop()
        prev_start, prev_len = segments.pop()
        segments.append((prev_start, prev_len + last_len))
    return segments


def cut_segment(src: Path, dst: Path, start: float, length: float) -> None:
    # 区切り位置をフレーム単位で正確にするため再エンコードする
    _run([
        "ffmpeg", "-y", "-v", "error", "-ss", f"{start:.3f}", "-i", str(src),
        "-t", f"{length:.3f}", "-an", "-c:v", "libx264", "-crf", "12",
        "-pix_fmt", "yuv420p", str(dst),
    ])


def concat(parts: list[Path], dst: Path) -> None:
    if len(parts) == 1:
        shutil.copyfile(parts[0], dst)
        return
    list_file = dst.with_suffix(".concat.txt")
    list_file.write_text("".join(f"file '{p.resolve()}'\n" for p in parts))
    _run([
        "ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0",
        "-i", str(list_file), "-c:v", "libx264", "-crf", "16",
        "-pix_fmt", "yuv420p", str(dst),
    ])
    list_file.unlink()


def retime_factor(generated_duration: float, target_duration: float) -> float | None:
    """生成結果の長さが元とずれていたら、合わせるための setpts の倍率。ずれが2%以内なら None。"""
    if generated_duration <= 0 or target_duration <= 0:
        return None
    factor = target_duration / generated_duration
    return None if abs(factor - 1.0) <= 0.02 else factor


def finalize_command(
    generated: Path, original: Path, dst: Path, *,
    has_audio: bool, label: str | None, retime: float | None = None,
) -> list[str]:
    """元動画の音声を戻し、AI生成のメタデータ（と任意で画面表示）を付ける ffmpeg コマンド。"""
    cmd = ["ffmpeg", "-y", "-v", "error", "-i", str(generated)]
    if has_audio:
        cmd += ["-i", str(original), "-map", "0:v:0", "-map", "1:a:0", "-c:a", "aac", "-shortest"]
    filters = []
    if retime:
        filters.append(f"setpts=PTS*{retime:.6f}")
    if label:
        safe = label.replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'")
        filters.append(
            f"drawtext=text='{safe}':x=w-tw-20:y=h-th-20:fontsize=h/28:"
            "fontcolor=white:box=1:boxcolor=black@0.5:boxborderw=8"
        )
    if filters:
        cmd += ["-vf", ",".join(filters)]
    cmd += [
        "-c:v", "libx264", "-crf", "16", "-pix_fmt", "yuv420p",
        "-metadata", f"comment={AI_NOTICE}",
        "-metadata", "description=AI-generated content",
        "-movflags", "+faststart", str(dst),
    ]
    return cmd


def finalize(
    generated: Path, original: Path, dst: Path, *,
    has_audio: bool, label: str | None, retime: float | None = None,
) -> None:
    _run(finalize_command(generated, original, dst, has_audio=has_audio, label=label, retime=retime))


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def retime_video(src: Path, dst: Path, factor: float) -> None:
    _run([
        "ffmpeg", "-y", "-v", "error", "-i", str(src), "-an",
        "-vf", f"setpts=PTS*{factor:.6f}", "-c:v", "libx264", "-crf", "12",
        "-pix_fmt", "yuv420p", str(dst),
    ])
