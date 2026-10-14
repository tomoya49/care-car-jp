from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

from . import __version__
from .consent import ConsentError, load_consent
from .media import MediaError
from .pipeline import run
from .wan_animate import WanConfig, WanError


def _resolution(value: str) -> tuple[int, int]:
    try:
        w, h = (int(x) for x in value.lower().split("x"))
    except ValueError:
        raise argparse.ArgumentTypeError("1280x720 のように書いてください")
    if w <= 0 or h <= 0 or w % 16 or h % 16:
        raise argparse.ArgumentTypeError("幅・高さは16の倍数にしてください（例: 1280x720, 832x480）")
    return w, h


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="motion-swap",
        description="動画の人物の動きはそのままに、顔・体つきを写真の人物へ置き換える（同意済みの素材専用）",
    )
    p.add_argument("--version", action="version", version=f"%(prog)s {__version__}")
    p.add_argument("--video", type=Path, required=True, help="元動画（動きを使う）")
    p.add_argument("--person", type=Path, required=True, help="置き換え先の人物の写真（全身が写っているもの推奨）")
    p.add_argument("--consent", type=Path, required=True, help="同意記録のJSON（consent.example.json 参照）")
    p.add_argument("--out", type=Path, required=True, help="出力する mp4")
    p.add_argument("--wan-repo", type=Path, default=os.environ.get("WAN_REPO"),
                   help="Wan2.2 を clone したフォルダ（環境変数 WAN_REPO でも可）")
    p.add_argument("--ckpt", type=Path, default=os.environ.get("WAN_ANIMATE_CKPT"),
                   help="Wan2.2-Animate-14B の重みのフォルダ（環境変数 WAN_ANIMATE_CKPT でも可）")
    p.add_argument("--wan-python", default=os.environ.get("WAN_PYTHON", sys.executable),
                   help="Wan2.2 を入れた環境の python（既定: この python）")
    p.add_argument("--resolution", type=_resolution, default=(1280, 720), help="処理解像度（既定 1280x720）")
    p.add_argument("--low-vram", action="store_true", help="VRAM 24GB 未満のとき（遅くなる）")
    p.add_argument("--no-relighting", action="store_true", help="照明合わせを切る")
    p.add_argument("--segment-seconds", type=float, default=None,
                   help="長い動画をこの秒数ごとに分けて処理する（メモリ不足対策。継ぎ目は出やすい）")
    p.add_argument("--label", default=None, help="画面右下に出す文字（例: 'AI生成'）。省略時は画面表示なし（メタデータには常に記録）")
    p.add_argument("--seed", type=int, default=None)
    p.add_argument("--work-dir", type=Path, default=None, help="途中ファイルの置き場（既定: 出力の横）")
    return p


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if args.wan_repo is None or args.ckpt is None:
        print("エラー: --wan-repo と --ckpt（または WAN_REPO / WAN_ANIMATE_CKPT）を指定してください", file=sys.stderr)
        return 2
    try:
        consent = load_consent(args.consent)
        print(f"同意確認OK: 演者={consent.performer.name} / 置き換え先={consent.subject.name} / 目的={consent.purpose}")
        out = run(
            video=args.video,
            person=args.person,
            out=args.out,
            consent=consent,
            wan=WanConfig(
                repo=args.wan_repo, ckpt_dir=args.ckpt, python=args.wan_python,
                resolution=args.resolution, low_vram=args.low_vram,
                relighting=not args.no_relighting, seed=args.seed,
            ),
            work_dir=args.work_dir or args.out.with_name(args.out.stem + "_work"),
            segment_seconds=args.segment_seconds,
            label=args.label,
        )
    except (ConsentError, MediaError, WanError, FileNotFoundError) as e:
        print(f"エラー: {e}", file=sys.stderr)
        return 1
    print(f"完成: {out}")
    return 0
