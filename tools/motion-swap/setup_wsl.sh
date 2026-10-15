#!/usr/bin/env bash
# motion-swap の準備を一度にする（Ubuntu 24.04 / Windows の WSL2 向け）。
#
#   bash ~/care-car-jp/tools/motion-swap/setup_wsl.sh
#
# 何度実行しても大丈夫（済んだところは飛ばす。重みのダウンロードは続きから）。
# 変えたいときだけ:
#   WAN_DIR=~/Wan2.2      Wan2.2 を置く場所
#   SKIP_WEIGHTS=1        重み（数十GB）のダウンロードを後回しにする
set -euo pipefail

WAN_DIR="${WAN_DIR:-$HOME/Wan2.2}"
TOOL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CKPT_DIR="$WAN_DIR/Wan2.2-Animate-14B"
VENV="$WAN_DIR/.venv"
PY="$VENV/bin/python"
CUDA_HOME="${CUDA_HOME:-/usr/local/cuda-12.8}"
export CUDA_HOME

# 動作を確かめた組み合わせ（2026-10 時点）
WAN_COMMIT="1ea34ff48f87168174e12956e200b1d908b1c5ff"
TORCH_PKGS=(torch==2.8.0 torchvision==0.23.0 torchaudio==2.8.0)   # PyPI 版は CUDA 12.8 向け
FLASH_ATTN_WHL="https://github.com/Dao-AILab/flash-attention/releases/download/v2.8.3/flash_attn-2.8.3+cu12torch2.8cxx11abiTRUE-cp312-cp312-linux_x86_64.whl"

step() { printf '\n\033[1m== %s\033[0m\n' "$*"; }
die() { printf '\n\033[31mエラー: %s\033[0m\n' "$*" >&2; exit 1; }

step "1/8 GPU を確認"
command -v nvidia-smi >/dev/null || die "nvidia-smi が見つかりません。Windows 側に NVIDIA の最新ドライバーを入れて、PCを再起動してください"
nvidia-smi --query-gpu=name,memory.total --format=csv,noheader || die "GPU が見えません。Windows 側の NVIDIA ドライバーを更新してください"

step "2/8 必要な道具（git, ffmpeg, python3.12）"
need=()
for pkg in git curl ffmpeg python3.12-venv python3.12-dev build-essential; do
  dpkg -s "$pkg" >/dev/null 2>&1 || need+=("$pkg")
done
if ((${#need[@]})); then
  echo "インストール: ${need[*]}（パスワードを聞かれたら、Ubuntu のパスワードを入れてください）"
  sudo apt-get update
  sudo apt-get install -y "${need[@]}"
else
  echo "そろっています"
fi

step "3/8 Wan2.2 本体（$WAN_DIR）"
if [[ ! -d "$WAN_DIR/.git" ]]; then
  git clone https://github.com/Wan-Video/Wan2.2.git "$WAN_DIR"
fi
git -C "$WAN_DIR" fetch -q origin "$WAN_COMMIT" 2>/dev/null || true
git -C "$WAN_DIR" checkout -q "$WAN_COMMIT"
echo "Wan2.2 $(git -C "$WAN_DIR" rev-parse --short HEAD)"

step "4/8 CUDA ツールキット 12.8（SAM 2 の組み立てに必要・約3GB）"
# NVIDIA 公式の WSL 向けリポジトリ。WSL では Windows 側のドライバーを使うので、ドライバーは入れない
if [[ ! -x "$CUDA_HOME/bin/nvcc" ]]; then
  tmp="$(mktemp -d)"
  curl -fsSL -o "$tmp/cuda-keyring.deb" \
    https://developer.download.nvidia.com/compute/cuda/repos/wsl-ubuntu/x86_64/cuda-keyring_1.1-1_all.deb
  sudo dpkg -i "$tmp/cuda-keyring.deb"
  sudo apt-get update
  sudo apt-get install -y cuda-toolkit-12-8
fi
export PATH="$CUDA_HOME/bin:$PATH"
nvcc --version | tail -1

step "5/8 Python の環境と部品（数GB・数分〜十数分）"
[[ -x "$PY" ]] || python3.12 -m venv "$VENV"
"$PY" -m pip install -q --upgrade pip wheel setuptools
# 後から入る部品に PyTorch の版を勝手に変えさせない
printf '%s\n' "${TORCH_PKGS[@]}" > "$WAN_DIR/.constraints.txt"
"$PY" -m pip install -c "$WAN_DIR/.constraints.txt" "${TORCH_PKGS[@]}"
# flash_attn は組み立て済み版を、SAM 2 は手元の PyTorch で組み立てるので、ここでは外す
grep -v '^flash_attn' "$WAN_DIR/requirements.txt" > "$WAN_DIR/.requirements-1.txt"
grep -v 'sam2' "$WAN_DIR/requirements_animate.txt" > "$WAN_DIR/.requirements-2.txt"
sam2_req="$(grep 'sam2' "$WAN_DIR/requirements_animate.txt" | sed 's/^-e *//; s/[[:space:]]*$//')"
"$PY" -m pip install -c "$WAN_DIR/.constraints.txt" \
  -r "$WAN_DIR/.requirements-1.txt" -r "$WAN_DIR/.requirements-2.txt"
# 前処理（process_pipepline.py）が使うのに requirements に書かれていない部品
"$PY" -m pip install -c "$WAN_DIR/.constraints.txt" moviepy==2.2.1

step "6/8 SAM 2（人物の切り抜き）と flash_attn（Wan2.2-Animate に必須）"
if "$PY" -c "from sam2 import _C" 2>/dev/null; then
  echo "SAM 2: 入っています"
else
  # 組み立てに使う PyTorch を、上で入れたものにする（--no-build-isolation がないと別の版を落としてくる）。
  # この PC の GPU の世代だけに絞って組み立てると速い
  arch="$(nvidia-smi --query-gpu=compute_cap --format=csv,noheader | head -1 | tr -d ' ')"
  TORCH_CUDA_ARCH_LIST="$arch" "$PY" -m pip install -c "$WAN_DIR/.constraints.txt" \
    --no-build-isolation --src "$WAN_DIR/.src" -e "$sam2_req"
fi
if "$PY" -c "import flash_attn" 2>/dev/null; then
  echo "flash_attn: 入っています"
else
  "$PY" -m pip install -c "$WAN_DIR/.constraints.txt" "$FLASH_ATTN_WHL"
fi
"$PY" -m pip install -q -e "$TOOL_DIR"
mkdir -p "$HOME/.local/bin"
ln -sf "$VENV/bin/motion-swap" "$HOME/.local/bin/motion-swap"

step "7/8 モデルの重み（数十GB。止まっても、もう一度実行すれば続きから）"
if [[ "${SKIP_WEIGHTS:-0}" == 1 ]]; then
  echo "SKIP_WEIGHTS=1 なので後回しにします"
else
  # transformers 4.51 が huggingface_hub 1.x に対応していないので 1.0 未満にとどめる
  "$PY" -m pip install -q -c "$WAN_DIR/.constraints.txt" "huggingface_hub[cli]>=0.34,<1.0"
  "$VENV/bin/hf" download Wan-AI/Wan2.2-Animate-14B --local-dir "$CKPT_DIR"
fi

step "8/8 設定を ~/.bashrc に保存"
marker="# motion-swap"
if ! grep -q "^$marker" "$HOME/.bashrc" 2>/dev/null; then
  cat >> "$HOME/.bashrc" <<EOF

$marker
export WAN_REPO="$WAN_DIR"
export WAN_ANIMATE_CKPT="$CKPT_DIR"
export WAN_PYTHON="$PY"
export PATH="\$HOME/.local/bin:\$PATH"
EOF
fi
export WAN_REPO="$WAN_DIR" WAN_ANIMATE_CKPT="$CKPT_DIR" WAN_PYTHON="$PY"

step "確認"
"$VENV/bin/motion-swap" doctor || true
echo
echo "終わりました。新しい設定を読み込むため、Ubuntu の画面を一度閉じて開き直してください。"
