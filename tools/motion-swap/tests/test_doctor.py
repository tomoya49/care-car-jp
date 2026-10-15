import sys

from motion_swap import doctor

GOOD_PROBE = {
    "torch": "2.8.0+cu128", "cuda": True, "gpu": "NVIDIA GeForce RTX 4090", "vram_gb": 24.0,
    "flash_attn": "2.8.3", "mod_wan": True, "mod_sam2": True, "mod_decord": True, "mod_onnxruntime": True,
}


def _fake_ckpt(tmp_path, skip=()):
    ckpt = tmp_path / "ckpt"
    for f in doctor.CKPT_FILES:
        if f not in skip:
            (ckpt / f).parent.mkdir(parents=True, exist_ok=True)
            (ckpt / f).write_bytes(b"x")
    for d in doctor.CKPT_DIRS:
        (ckpt / d).mkdir(parents=True, exist_ok=True)
    return ckpt


def _fake_repo(tmp_path):
    repo = tmp_path / "Wan2.2"
    repo.mkdir()
    (repo / "generate.py").write_text("")
    return repo


def test_all_good(tmp_path):
    checks = doctor.run_checks(_fake_repo(tmp_path), _fake_ckpt(tmp_path), "python", GOOD_PROBE)
    assert all(c.ok for c in checks), [c for c in checks if not c.ok]


def test_reports_missing_weight_file(tmp_path):
    ckpt = _fake_ckpt(tmp_path, skip={"Wan2.1_VAE.pth"})
    checks = doctor.run_checks(_fake_repo(tmp_path), ckpt, "python", GOOD_PROBE)
    bad = [c for c in checks if not c.ok]
    assert len(bad) == 1 and "Wan2.1_VAE.pth" in bad[0].hint


def test_reports_no_gpu_and_no_flash_attn(tmp_path):
    probe = {**GOOD_PROBE, "cuda": False}
    del probe["flash_attn"]
    probe["flash_attn_error"] = "ModuleNotFoundError"
    labels = [c.label for c in doctor.run_checks(_fake_repo(tmp_path), _fake_ckpt(tmp_path), "python", probe)
              if not c.ok]
    assert any("GPU" in s for s in labels) and any("flash_attn" in s for s in labels)


def test_recommendations():
    assert any("--low-vram" in t for t in doctor.recommend({"vram_gb": 24.0}))
    assert any("832x480" in t for t in doctor.recommend({"vram_gb": 16.0}))
    assert doctor.recommend({"vram_gb": 80.0}) == []
    assert doctor.recommend({}) == []


def test_probe_runs_with_real_python(tmp_path):
    # この python には torch が無いので、torch_error が返ってくる（落ちないこと）
    p = doctor.probe_python(sys.executable, None)
    assert "probe_error" not in p
    assert "mod_wan" in p
