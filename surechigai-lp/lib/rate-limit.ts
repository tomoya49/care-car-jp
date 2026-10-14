// 簡易レート制限（メモリ内）。同一IPから短時間に続けて送信されたものを拒否します。
// サーバーレス環境ではインスタンスごとの記録になるため完全ではありませんが、
// 連打や単純なボットを止める目的には十分です。スマホ回線は複数人で同じIPを共有することがあるので、上限は緩めにしています。
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 5;
const hits = new Map<string, number[]>();

export function isRateLimited(key: string, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);

  if (hits.size > 5_000) {
    for (const [k, times] of hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
    }
  }
  return recent.length > MAX_REQUESTS;
}
