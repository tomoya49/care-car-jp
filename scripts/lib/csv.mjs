import iconv from 'iconv-lite';

export function decodeBuffer(buffer, encoding = 'utf-8') {
  const enc = (encoding || 'utf-8').toLowerCase();
  if (enc === 'shift_jis' || enc === 'sjis' || enc === 'shift-jis') {
    return iconv.decode(buffer, 'Shift_JIS');
  }
  let text = iconv.decode(buffer, 'utf-8');
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  return text;
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (c === '\r') {
      // ignore; \n (or end of input) closes the row
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const nonEmptyRows = rows.filter((r) => !(r.length === 1 && r[0] === ''));
  if (nonEmptyRows.length === 0) return [];

  const header = nonEmptyRows[0].map((h) => h.trim());
  return nonEmptyRows.slice(1).map((r) => {
    const obj = {};
    header.forEach((h, idx) => {
      obj[h] = (r[idx] ?? '').trim();
    });
    return obj;
  });
}
