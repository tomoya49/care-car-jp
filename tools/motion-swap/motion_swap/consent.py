"""同意記録の確認。

元動画で演じている人（performer）と、顔・体つきを使われる人（subject）の
両方の同意記録がないと処理を始めない。
"""

from __future__ import annotations

import datetime as dt
import hashlib
import json
from dataclasses import dataclass
from pathlib import Path


class ConsentError(ValueError):
    pass


@dataclass(frozen=True)
class Person:
    name: str
    consented_on: dt.date


@dataclass(frozen=True)
class Consent:
    performer: Person
    subject: Person
    purpose: str
    document: Path
    expires_on: dt.date | None
    sha256: str  # 同意記録ファイル自体のハッシュ（出力の記録に残す）


def _parse_date(value: object, field: str) -> dt.date:
    if not isinstance(value, str):
        raise ConsentError(f"{field} は YYYY-MM-DD の文字列で書いてください")
    try:
        return dt.date.fromisoformat(value)
    except ValueError as e:
        raise ConsentError(f"{field} の日付が読めません: {value!r}") from e


def _parse_person(data: dict, key: str, today: dt.date) -> Person:
    raw = data.get(key)
    if not isinstance(raw, dict):
        raise ConsentError(f"{key} がありません")
    name = str(raw.get("name", "")).strip()
    if not name:
        raise ConsentError(f"{key}.name が空です")
    consented_on = _parse_date(raw.get("consented_on"), f"{key}.consented_on")
    if consented_on > today:
        raise ConsentError(f"{key}.consented_on が未来の日付です")
    return Person(name=name, consented_on=consented_on)


def load_consent(path: Path, today: dt.date | None = None) -> Consent:
    today = today or dt.date.today()
    path = Path(path)
    if not path.is_file():
        raise ConsentError(f"同意記録が見つかりません: {path}")
    raw_bytes = path.read_bytes()
    try:
        data = json.loads(raw_bytes)
    except json.JSONDecodeError as e:
        raise ConsentError(f"同意記録のJSONが壊れています: {e}") from e
    if not isinstance(data, dict):
        raise ConsentError("同意記録の形式が違います")

    performer = _parse_person(data, "performer", today)
    subject = _parse_person(data, "subject", today)

    purpose = str(data.get("purpose", "")).strip()
    if not purpose:
        raise ConsentError("purpose（利用目的）が空です")

    doc_value = str(data.get("document", "")).strip()
    if not doc_value:
        raise ConsentError("document（署名済み同意書のファイル）が空です")
    document = Path(doc_value)
    if not document.is_absolute():
        document = path.parent / document
    if not document.is_file():
        raise ConsentError(f"同意書のファイルが見つかりません: {document}")

    expires_on = None
    if data.get("expires_on"):
        expires_on = _parse_date(data["expires_on"], "expires_on")
        if expires_on < today:
            raise ConsentError(f"同意の期限が切れています（{expires_on}）")

    return Consent(
        performer=performer,
        subject=subject,
        purpose=purpose,
        document=document,
        expires_on=expires_on,
        sha256=hashlib.sha256(raw_bytes).hexdigest(),
    )
