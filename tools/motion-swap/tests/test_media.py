import pytest

from motion_swap import media


def test_plan_no_split():
    assert media.plan_segments(10.0, None) == [(0.0, 10.0)]
    assert media.plan_segments(10.0, 20.0) == [(0.0, 10.0)]


def test_plan_split_and_merge_short_tail():
    assert media.plan_segments(10.0, 4.0) == [(0.0, 4.0), (4.0, 4.0), (8.0, 2.0)]
    segs = media.plan_segments(8.5, 4.0)
    assert segs == [(0.0, 4.0), (4.0, 4.5)]


def test_plan_zero_duration():
    with pytest.raises(media.MediaError):
        media.plan_segments(0, 5)


def test_retime_factor():
    assert media.retime_factor(10.0, 10.1) is None
    assert media.retime_factor(8.0, 10.0) == pytest.approx(1.25)


def test_finalize_command_audio_and_label():
    cmd = media.finalize_command("g.mp4", "o.mp4", "out.mp4", has_audio=True, label="AI生成: テスト")
    assert ["-map", "1:a:0"] == cmd[cmd.index("-map", cmd.index("-map") + 1):][:2]
    vf = cmd[cmd.index("-vf") + 1]
    assert "AI生成\\: テスト" in vf
    assert any(x.startswith("comment=AI-generated") for x in cmd)


def test_finalize_command_no_audio_no_label():
    cmd = media.finalize_command("g.mp4", "o.mp4", "out.mp4", has_audio=False, label=None)
    assert "-vf" not in cmd and "1:a:0" not in cmd
