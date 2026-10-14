from pathlib import Path

from motion_swap.wan_animate import WanConfig, generate_command, preprocess_command

CFG = WanConfig(repo=Path("/w"), ckpt_dir=Path("/ck"))


def test_preprocess_matches_readme_replacement():
    cmd = preprocess_command(CFG, Path("/v.mp4"), Path("/p.jpg"), Path("/out"), fps=24)
    assert "--replace_flag" in cmd and "--retarget_flag" not in cmd
    assert cmd[cmd.index("--fps") + 1] == "24"
    i = cmd.index("--resolution_area")
    assert cmd[i + 1:i + 3] == ["1280", "720"]
    assert cmd[cmd.index("--ckpt_path") + 1] == "/ck/process_checkpoint"


def test_generate_default_and_low_vram():
    cmd = generate_command(CFG, Path("/out"), Path("/g.mp4"))
    assert cmd[cmd.index("--task") + 1] == "animate-14B"
    assert "--use_relighting_lora" in cmd and "--offload_model" not in cmd
    low = generate_command(
        WanConfig(repo=Path("/w"), ckpt_dir=Path("/ck"), low_vram=True, relighting=False, seed=7),
        Path("/out"), Path("/g.mp4"),
    )
    assert "--use_relighting_lora" not in low
    assert {"--offload_model", "--convert_model_dtype", "--t5_cpu"} <= set(low)
    assert low[low.index("--base_seed") + 1] == "7"
