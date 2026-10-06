/**
 * Пошук відео YouTube для треку каталогу (офіційний YouTube Data API, ротація ключів при вичерпанні квоти).
 * Знайдений videoId кешується в tracks.youtube_video_id назавжди — повторних запитів немає.
 */
export interface YoutubeResolver {
  search(query: string, durationMs: number): Promise<string | null>;
}

type SearchItem = { id: { videoId?: string }; snippet: { title: string; channelTitle: string } };

const BAD_WORDS =
  /\b(cover|karaoke|instrumental|reaction|live|slowed|sped up|nightcore|8d|remix|lyrics? video|tutorial|lesson)\b/i;

export class YoutubeDataApi implements YoutubeResolver {
  private keyIndex = 0;
  private exhaustedUntil = new Map<string, number>();

  constructor(private keys: string[]) {}

  async search(query: string, _durationMs: number): Promise<string | null> {
    for (let attempt = 0; attempt < this.keys.length; attempt++) {
      const key = this.nextKey();
      if (!key) return null;
      const url = new URL("https://www.googleapis.com/youtube/v3/search");
      url.search = new URLSearchParams({
        part: "snippet",
        type: "video",
        videoEmbeddable: "true",
        maxResults: "5",
        q: query,
        key,
      }).toString();
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (res.status === 403) {
        // Квота ключа вичерпана — до опівночі за тихоокеанським часом; беремо наступний ключ.
        this.exhaustedUntil.set(key, Date.now() + 6 * 3600_000);
        continue;
      }
      if (!res.ok) return null;
      const data = (await res.json()) as { items?: SearchItem[] };
      const items = (data.items ?? []).filter((i) => i.id.videoId);
      const preferred =
        items.find((i) => / - topic$/i.test(i.snippet.channelTitle)) ??
        items.find((i) => /official (audio|video|music video)/i.test(i.snippet.title)) ??
        items.find((i) => !BAD_WORDS.test(i.snippet.title)) ??
        items[0];
      return preferred?.id.videoId ?? null;
    }
    return null;
  }

  private nextKey(): string | null {
    const now = Date.now();
    for (let i = 0; i < this.keys.length; i++) {
      const key = this.keys[(this.keyIndex + i) % this.keys.length]!;
      if ((this.exhaustedUntil.get(key) ?? 0) < now) {
        this.keyIndex = (this.keyIndex + i + 1) % this.keys.length;
        return key;
      }
    }
    return null;
  }
}

export const noYoutube: YoutubeResolver = { search: async () => null };
