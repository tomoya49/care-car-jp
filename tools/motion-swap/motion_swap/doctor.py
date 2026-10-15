"""`motion-swap doctor`: 動かす前に、必要なものがそろっているかをまとめて確かめる。"""

from __future__ import annotations

import json
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path

# Wan2.2 の wan/configs/wan_animate_14B.py と preprocess_data.py が読みにいくファイル
CKPT_FILES = [
    "models_t5_umt5-xxl-enc-bf16.pth",
    "models_clip_open-clip-xlm-roberta-large-vit-huge-14.pth",
    "Wan2.1_VAE.pth",
    "relighting_lora.ckpt",
    "process_checkpoint/pose2d/vitpose_h_wholebody.onnx",
    "process_checkpoint/det/yolov10m.onnx",
    "process_checkpoint/sam2/sam2_hiera_large.pt",
]
CKPT_DIRS = ["google/umt5-xxl", "xlm-roberta-large"]

# Wan2.2 の環境の python で動かして、GPU まわりを調べる
_PROBE = r"""
import json, importlib.util
r = {}
try:
    import torch
    r["torch"] = torch.__version__
    r["cuda"] = torch.cuda.is_available()
    if r["cuda"]:
        p = torch.cuda.get_device_properties(0)
        r["gpu"] = p.name
        r["vram_gb"] = round(p.total_memory / 1024**3, 1)
except Exception as e:
    r["torch_error"] = repr(e)
try:
    import flash_attn
    r["flash_attn"] = flash_attn.__version__
except Exception as e:
    r["flash_attn_error"] = repr(e)
for mod in ["wan", "sam2", "decord", "onnxruntime", "moviepy"]:
    r["mod_" + mod] = importlib.util.find_spec(mod) is not None
try:
    from sam2 import _C  # 人物マスクの穴埋めに使う GPU 用の部品（組み立てが必要）
    r["sam2_C"] = True
except Exception:
    r["sam2_C"] = False
print(json.dumps(r))
"""


@dataclass
class Check:
    ok: bool
    label: str
    hint: str = ""


def probe_python(python: str, repo: Path | None) -> dict:
    cwd = repo if repo and repo.is_dir() else None
    try:
        proc = subprocess.run([python, "-c", _PROBE], capture_output=True, text=True, cwd=cwd, timeout=300)
    except (OSError, subprocess.TimeoutExpired) as e:
        return {"probe_error": repr(e)}
    if proc.returncode != 0:
        return {"probe_error": proc.stderr.strip()[-500:]}
    return json.loads(proc.stdout.strip().splitlines()[-1])


def run_checks(repo: Path | None, ckpt: Path | None, python: str, probe: dict | None = None) -> list[Check]:
    checks: list[Check] = []

    has_ffmpeg = all(shutil.which(t) for t in ("ffmpeg", "ffprobe"))
    checks.append(Check(has_ffmpeg, "ffmpeg", "" if has_ffmpeg else "sudo apt install ffmpeg"))

    repo_ok = bool(repo) and (repo / "generate.py").is_file()
    checks.append(Check(repo_ok, f"Wan2.2 本体 ({repo})",
                        "" if repo_ok else "WAN_REPO に Wan2.2 を clone したフォルダを設定してください"))

    if ckpt and ckpt.is_dir():
        missing = [f for f in CKPT_FILES if not (ckpt / f).is_file()]
        missing += [d + "/" for d in CKPT_DIRS if not (ckpt / d).is_dir()]
        checks.append(Check(not missing, f"モデルの重み ({ckpt})",
                            "" if not missing else "足りないファイル: " + ", ".join(missing)
                            + "（ダウンロードが途中なら、同じコマンドをもう一度実行すると続きから入ります）"))
    else:
        checks.append(Check(False, f"モデルの重み ({ckpt})",
                            "WAN_ANIMATE_CKPT に Wan2.2-Animate-14B のフォルダを設定してください"))

    p = probe if probe is not None else probe_python(python, repo)
    if "probe_error" in p:
        checks.append(Check(False, f"Wan2.2 用の python ({python})", p["probe_error"]))
        return checks

    if "torch" not in p:
        checks.append(Check(False, "PyTorch", p.get("torch_error", "")))
    else:
        checks.append(Check(True, f"PyTorch {p['torch']}"))
        if p.get("cuda"):
            checks.append(Check(True, f"GPU {p['gpu']}（VRAM {p['vram_gb']}GB）"))
        else:
            checks.append(Check(False, "GPU（CUDA）",
                                "PyTorch から GPU が見えません。Windows 側の NVIDIA ドライバーを更新し、"
                                "nvidia-smi が動くか確かめてください"))

    fa = "flash_attn" in p
    checks.append(Check(fa, "flash_attn（Wan2.2-Animate に必須）",
                        "" if fa else p.get("flash_attn_error", "") + " → setup_wsl.sh をもう一度実行してください"))

    for mod, name in [("wan", "Wan2.2 のコード"), ("sam2", "SAM 2（人物の切り抜き）"),
                      ("decord", "decord（動画読み込み）"), ("onnxruntime", "onnxruntime（骨格の抽出）"),
                      ("moviepy", "moviepy（前処理の動画書き出し）")]:
        ok = p.get("mod_" + mod, False)
        checks.append(Check(ok, name, "" if ok else "setup_wsl.sh をもう一度実行してください"))
    if p.get("mod_sam2"):
        ok = p.get("sam2_C", False)
        checks.append(Check(ok, "SAM 2 の GPU 用部品（組み立て済みか）",
                            "" if ok else "CUDA ツールキットがないまま入った可能性があります。"
                            "setup_wsl.sh をもう一度実行してください"))
    return checks


def recommend(probe: dict) -> list[str]:
    tips = []
    vram = probe.get("vram_gb")
    if vram is None:
        return tips
    if vram < 80:
        tips.append("--low-vram を付けてください（VRAM 80GB 未満では、モデルを CPU に逃がしながら動かす必要があります）")
    if vram < 24:
        tips.append("--resolution 832x480 から始めてください（VRAM 24GB 未満）")
    return tips


def main(repo: Path | None, ckpt: Path | None, python: str) -> int:
    probe = probe_python(python, repo)
    checks = run_checks(repo, ckpt, python, probe)
    for c in checks:
        print(("  OK  " if c.ok else "  NG  ") + c.label)
        if c.hint:
            print("        → " + c.hint)
    tips = recommend(probe)
    if tips:
        print("\nおすすめの指定:")
        for t in tips:
            print("  - " + t)
    bad = sum(not c.ok for c in checks)
    print("\n準備完了です。" if not bad else f"\n{bad} 件の問題があります。上の → を見て直してください。")
    return 0 if not bad else 1
