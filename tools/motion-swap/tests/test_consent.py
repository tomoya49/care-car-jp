import datetime as dt
import json

import pytest

from motion_swap.consent import ConsentError, load_consent

TODAY = dt.date(2026, 10, 14)


def test_valid(consent_file):
    c = load_consent(consent_file, today=TODAY)
    assert c.performer.name == "演者A"
    assert c.subject.name == "モデルB"
    assert len(c.sha256) == 64


def _edit(path, **changes):
    data = json.loads(path.read_text())
    for key, value in changes.items():
        if value is None:
            data.pop(key, None)
        else:
            data[key] = value
    path.write_text(json.dumps(data, ensure_ascii=False))


@pytest.mark.parametrize("changes, message", [
    ({"performer": None}, "performer"),
    ({"subject": {"name": "", "consented_on": "2026-10-01"}}, "subject.name"),
    ({"subject": {"name": "B", "consented_on": "2026-12-01"}}, "未来"),
    ({"purpose": ""}, "purpose"),
    ({"document": "missing.pdf"}, "同意書"),
    ({"expires_on": "2026-01-01"}, "期限"),
    ({"expires_on": "not-a-date"}, "日付"),
])
def test_rejects(consent_file, changes, message):
    _edit(consent_file, **changes)
    with pytest.raises(ConsentError, match=message):
        load_consent(consent_file, today=TODAY)


def test_missing_file(tmp_path):
    with pytest.raises(ConsentError, match="見つかりません"):
        load_consent(tmp_path / "nope.json")
