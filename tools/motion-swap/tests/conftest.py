import json
import subprocess
import textwrap
from pathlib import Path

import pytest


@pytest.fixture
def consent_file(tmp_path: Path) -> Path:
    (tmp_path / "signed.pdf").write_bytes(b"%PDF-1.4 dummy")
    path = tmp_path / "consent.json"
    path.write_text(json.dumps({
        "performer": {"name": "演者A", "consented_on": "2026-10-01"},
        "subject": {"name": "モデルB", "consented_on": "2026-10-02"},
        "purpose": "自社LPの広告動画",
        "document": "signed.pdf",
        "expires_on": "2027-10-01",
    }, ensure_ascii=False))
    return path


def make_video(path: Path, seconds: float, fps: int = 24, audio: bool = True) -> Path:
    cmd = ["ffmpeg", "-y", "-v", "error",
           "-f", "lavfi", "-i", f"testsrc=size=320x240:rate={fps}:duration={seconds}"]
    if audio:
        cmd += ["-f", "lavfi", "-i", f"sine=frequency=440:duration={seconds}", "-c:a", "aac"]
    cmd += ["-c:v", "libx264", "-pix_fmt", "yuv420p", str(path)]
    subprocess.run(cmd, check=True)
    return path


@pytest.fixture
def fake_wan(tmp_path: Path) -> tuple[Path, Path]:
    """本物の Wan2.2 の代わり。前処理は入力動画を保存し、生成はそれを 30fps に変えて書き出す
    （本物でも出力 fps が元とずれうるので、その補正も確かめられる）。"""
    repo = tmp_path / "Wan2.2"
    pre = repo / "wan/modules/animate/preprocess"
    pre.mkdir(parents=True)
    (pre / "preprocess_data.py").write_text(textwrap.dedent("""
        import argparse, shutil
        p = argparse.ArgumentParser()
        for a in ["--ckpt_path", "--video_path", "--refer_path", "--save_path", "--fps",
                  "--iterations", "--k", "--w_len", "--h_len"]:
            p.add_argument(a)
        p.add_argument("--resolution_area", nargs=2)
        p.add_argument("--replace_flag", action="store_true")
        a = p.parse_args()
        shutil.copyfile(a.video_path, a.save_path + "/src_pose.mp4")
    """))
    (repo / "generate.py").write_text(textwrap.dedent("""
        import argparse, subprocess
        p = argparse.ArgumentParser()
        for a in ["--task", "--ckpt_dir", "--src_root_path", "--refert_num", "--save_file", "--base_seed"]:
            p.add_argument(a)
        p.add_argument("--replace_flag", action="store_true")
        p.add_argument("--use_relighting_lora", action="store_true")
        a = p.parse_args()
        assert a.task == "animate-14B" and a.replace_flag
        # フレーム数はそのままで 30fps 扱いにする（=長さが変わる）
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-r", "30", "-i", a.src_root_path + "/src_pose.mp4",
                        "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", a.save_file], check=True)
    """))
    ckpt = tmp_path / "Wan2.2-Animate-14B"
    (ckpt / "process_checkpoint").mkdir(parents=True)
    return repo, ckpt
