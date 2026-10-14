"""偽の Wan2.2 を使って、GPU なしで全体の流れを通す。"""

import json
import sys

import pytest

from motion_swap import media
from motion_swap.cli import main

from .conftest import make_video


@pytest.mark.parametrize("segment_seconds", [None, 2.0])
def test_full_run(tmp_path, consent_file, fake_wan, segment_seconds):
    repo, ckpt = fake_wan
    video = make_video(tmp_path / "in.mp4", seconds=5, fps=24)
    person = tmp_path / "person.jpg"
    person.write_bytes(b"fake jpg")
    out = tmp_path / "out" / "result.mp4"

    argv = ["--video", str(video), "--person", str(person), "--consent", str(consent_file),
            "--out", str(out), "--wan-repo", str(repo), "--ckpt", str(ckpt),
            "--wan-python", sys.executable, "--label", "AI生成"]
    if segment_seconds:
        argv += ["--segment-seconds", str(segment_seconds)]
    assert main(argv) == 0

    info = media.probe(out)
    assert info.has_audio
    assert info.duration == pytest.approx(5.0, abs=0.25)  # 30fps 化でずれた長さが元に戻っている

    record = json.loads((out.parent / "result.mp4.provenance.json").read_text())
    assert record["ai_generated"] is True
    assert record["consent"]["subject"] == "モデルB"
    assert record["output_sha256"] == media.sha256_file(out)


def test_refuses_without_valid_consent(tmp_path, fake_wan):
    repo, ckpt = fake_wan
    video = make_video(tmp_path / "in.mp4", seconds=1)
    rc = main(["--video", str(video), "--person", str(video), "--consent", str(tmp_path / "none.json"),
               "--out", str(tmp_path / "o.mp4"), "--wan-repo", str(repo), "--ckpt", str(ckpt)])
    assert rc == 1
    assert not (tmp_path / "o.mp4").exists()
