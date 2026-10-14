"""Wan2.2-Animate（replacement モード）の呼び出し。

Wan2.2 本体は別の場所に clone して、その中のスクリプトをサブプロセスで動かす。
コマンドは公式 README（https://github.com/Wan-Video/Wan2.2 「Run Wan-Animate」）に合わせている。
"""

from __future__ import annotations

import subprocess
from dataclasses import dataclass
from pathlib import Path


class WanError(RuntimeError):
    pass


@dataclass(frozen=True)
class WanConfig:
    repo: Path          # Wan2.2 を clone したフォルダ
    ckpt_dir: Path      # Wan2.2-Animate-14B の重みのフォルダ
    python: str = "python"  # Wan2.2 用の仮想環境の python
    resolution: tuple[int, int] = (1280, 720)
    low_vram: bool = False  # 24GB未満のGPU向け（遅くなる）
    relighting: bool = True  # 元動画の照明に人物の明るさを合わせる
    seed: int | None = None

    def check(self) -> None:
        if not (self.repo / "generate.py").is_file():
            raise WanError(f"Wan2.2 の generate.py が見つかりません: {self.repo}")
        if not (self.ckpt_dir / "process_checkpoint").is_dir():
            raise WanError(f"重みが見つかりません（process_checkpoint がない）: {self.ckpt_dir}")


def preprocess_command(cfg: WanConfig, video: Path, person: Path, out_dir: Path, fps: int) -> list[str]:
    w, h = cfg.resolution
    return [
        cfg.python, "./wan/modules/animate/preprocess/preprocess_data.py",
        "--ckpt_path", str((cfg.ckpt_dir / "process_checkpoint").resolve()),
        "--video_path", str(video.resolve()),
        "--refer_path", str(person.resolve()),
        "--save_path", str(out_dir.resolve()),
        "--resolution_area", str(w), str(h),
        "--fps", str(fps),  # 元動画と合わせないと音声とずれる
        # 人物マスクの広げ方。README の replacement の例と同じ値
        "--iterations", "3", "--k", "7", "--w_len", "1", "--h_len", "1",
        "--replace_flag",
    ]


def generate_command(cfg: WanConfig, processed_dir: Path, out_file: Path) -> list[str]:
    cmd = [
        cfg.python, "generate.py", "--task", "animate-14B",
        "--ckpt_dir", str(cfg.ckpt_dir.resolve()),
        "--src_root_path", str(processed_dir.resolve()),
        "--refert_num", "1", "--replace_flag",
        "--save_file", str(out_file.resolve()),
    ]
    if cfg.relighting:
        cmd.append("--use_relighting_lora")
    if cfg.low_vram:
        cmd += ["--offload_model", "True", "--convert_model_dtype", "--t5_cpu"]
    if cfg.seed is not None:
        cmd += ["--base_seed", str(cfg.seed)]
    return cmd


def _run(cmd: list[str], cwd: Path) -> None:
    print("$", " ".join(cmd), flush=True)
    proc = subprocess.run(cmd, cwd=cwd)
    if proc.returncode != 0:
        raise WanError(f"Wan2.2 の処理が失敗しました（終了コード {proc.returncode}）")


def replace_person(
    cfg: WanConfig, video: Path, person: Path, work_dir: Path, out_file: Path, fps: int,
) -> Path:
    processed = work_dir / "process_results"
    processed.mkdir(parents=True, exist_ok=True)
    _run(preprocess_command(cfg, video, person, processed, fps), cwd=cfg.repo)
    _run(generate_command(cfg, processed, out_file), cwd=cfg.repo)
    if not out_file.is_file():
        raise WanError(f"生成結果のファイルができていません: {out_file}")
    return out_file
