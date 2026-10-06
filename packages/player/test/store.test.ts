import type { Track } from "@musicdb/contracts";
import { describe, expect, it, vi } from "vitest";
import {
  championPath,
  createPlayerStore,
  loudnessGain,
  podium,
  replayTournament,
  tournamentKey,
  tournamentRanking,
} from "../src/index";

const track = (id: string, opts: { playable?: boolean; durationMs?: number } = {}): Track => ({
  id,
  title: `T${id}`,
  durationMs: opts.durationMs ?? 200_000,
  explicit: false,
  artists: [{ id: "a", name: "A", slug: "a" }],
  release: null,
  releaseDate: null,
  source: "catalog",
  genres: [],
  playback: {
    audio: false,
    youtubeVideoId: opts.playable === false ? null : `yt${id}`,
    resolvable: opts.playable !== false,
  },
  hasLyrics: false,
  playCount: 0,
  rating: { average: null, count: 0 },
  uploader: null,
  createdAt: new Date(0).toISOString(),
});

const seq = (values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length]!;
};

const ids = (s: ReturnType<typeof createPlayerStore>) =>
  s
    .getState()
    .upcoming()
    .map((i) => i.track.id);
const cur = (s: ReturnType<typeof createPlayerStore>) => s.getState().current?.track.id;

describe("черга", () => {
  it("контекст, наступний, попередній із рестартом після 3 с", () => {
    const s = createPlayerStore();
    s.getState().playContext([track("1"), track("2"), track("3")], 1);
    expect(cur(s)).toBe("2");
    s.getState().next();
    expect(cur(s)).toBe("3");
    s.getState().onTime(5000);
    s.getState().previous();
    expect(cur(s)).toBe("3");
    expect(s.getState().seekRequest?.ms).toBe(0);
    s.getState().onTime(1000);
    s.getState().previous();
    expect(cur(s)).toBe("2");
  });

  it("пріоритетна черга грає раніше за контекст", () => {
    const s = createPlayerStore();
    s.getState().playContext([track("1"), track("2")]);
    s.getState().addToQueue([track("q1")]);
    s.getState().playNext([track("q0")]);
    expect(ids(s)).toEqual(["q0", "q1", "2"]);
    s.getState().next();
    expect(cur(s)).toBe("q0");
    s.getState().next();
    expect(cur(s)).toBe("q1");
    s.getState().next();
    expect(cur(s)).toBe("2");
  });

  it("невідтворювані треки пропускаються", () => {
    const s = createPlayerStore();
    s.getState().playContext([
      track("1", { playable: false }),
      track("2"),
      track("3", { playable: false }),
      track("4"),
    ]);
    expect(cur(s)).toBe("2");
    s.getState().next();
    expect(cur(s)).toBe("4");
  });

  it("перемішування лишає поточний трек першим і відновлює порядок", () => {
    const s = createPlayerStore({ random: seq([0.9, 0.1, 0.5, 0.3]) });
    s.getState().playContext(
      ["1", "2", "3", "4", "5"].map((x) => track(x)),
      2,
    );
    s.getState().toggleShuffle();
    expect(cur(s)).toBe("3");
    expect(s.getState().items[0]!.track.id).toBe("3");
    expect(ids(s).sort()).toEqual(["1", "2", "4", "5"]);
    s.getState().toggleShuffle();
    expect(ids(s)).toEqual(["4", "5"]);
  });

  it("повтор усього й повтор одного", () => {
    const s = createPlayerStore();
    s.getState().setAutoplay(false);
    s.getState().playContext([track("1"), track("2")], 1);
    s.getState().cycleRepeat();
    expect(s.getState().repeat).toBe("all");
    s.getState().onEnded();
    expect(cur(s)).toBe("1");
    s.getState().cycleRepeat();
    expect(s.getState().repeat).toBe("one");
    const token = s.getState().restartToken;
    s.getState().onEnded();
    expect(cur(s)).toBe("1");
    expect(s.getState().restartToken).toBe(token + 1);
  });

  it("кінець черги: автопродовження радіо", async () => {
    const fetchRadio = vi.fn(async () => [track("r1"), track("r2")]);
    const s = createPlayerStore({ fetchRadio });
    s.getState().playContext([track("1")]);
    s.getState().onEnded();
    await vi.waitFor(() => expect(cur(s)).toBe("r1"));
    expect(fetchRadio).toHaveBeenCalledWith(expect.objectContaining({ id: "1" }), ["1"]);
    expect(s.getState().current!.origin).toBe("radio");
  });

  it("без автопродовження в кінці — пауза на початку треку", () => {
    const s = createPlayerStore();
    s.getState().setAutoplay(false);
    s.getState().playContext([track("1")]);
    s.getState().onPlaying();
    s.getState().onEnded();
    expect(s.getState().status).toBe("paused");
    expect(cur(s)).toBe("1");
  });

  it("перехід до елемента черги й перестановка", () => {
    const s = createPlayerStore();
    s.getState().playContext(["1", "2", "3", "4"].map((x) => track(x)));
    const four = s
      .getState()
      .upcoming()
      .find((i) => i.track.id === "4")!;
    s.getState().moveInQueue(four.uid, 0);
    expect(ids(s)).toEqual(["4", "2", "3"]);
    const three = s
      .getState()
      .upcoming()
      .find((i) => i.track.id === "3")!;
    s.getState().jumpTo(three.uid);
    expect(cur(s)).toBe("3");
  });
});

describe("зарахування прослуховувань", () => {
  it("рахує лише фактично прослухане, без перемотувань", () => {
    const report = vi.fn();
    const s = createPlayerStore({ report });
    s.getState().playContext([track("1"), track("2")], 0, { type: "album", id: "al" });
    s.getState().onPlaying();
    for (let ms = 1000; ms <= 20_000; ms += 1000) s.getState().onTime(ms);
    s.getState().onTime(150_000); // перемотування
    s.getState().onTime(151_000);
    s.getState().next();
    expect(report).toHaveBeenCalledWith("1", 21_000, { type: "album", id: "al" });
  });

  it("не надсилає звіт, якщо нічого не прослухано", () => {
    const report = vi.fn();
    const s = createPlayerStore({ report });
    s.getState().playContext([track("1"), track("2")]);
    s.getState().next();
    expect(report).not.toHaveBeenCalled();
  });
});

describe("вирівнювання гучності", () => {
  it("тихіше для гучних треків, без підсилення тихих", () => {
    expect(loudnessGain(-8)).toBeCloseTo(0.501, 2);
    expect(loudnessGain(-20)).toBe(1);
    expect(loudnessGain(null)).toBe(1);
  });
});

describe("таймер сну", () => {
  it("пауза через задану кількість хвилин; новий таймер скасовує попередній", () => {
    vi.useFakeTimers();
    try {
      const s = createPlayerStore();
      s.getState().playContext([track("1"), track("2")]);
      s.getState().onPlaying();
      s.getState().setSleepTimer(15);
      expect(s.getState().sleep).toMatchObject({ mode: "time" });
      s.getState().setSleepTimer(30);
      vi.advanceTimersByTime(15 * 60_000);
      expect(s.getState().status).toBe("playing");
      vi.advanceTimersByTime(15 * 60_000);
      expect(s.getState().status).toBe("paused");
      expect(s.getState().sleep).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("вимкнений таймер не ставить на паузу", () => {
    vi.useFakeTimers();
    try {
      const s = createPlayerStore();
      s.getState().playContext([track("1")]);
      s.getState().onPlaying();
      s.getState().setSleepTimer(5);
      s.getState().setSleepTimer(null);
      vi.advanceTimersByTime(10 * 60_000);
      expect(s.getState().status).toBe("playing");
    } finally {
      vi.useRealTimers();
    }
  });

  it("«до кінця пісні» — зупинка наприкінці поточного треку без переходу далі", () => {
    const s = createPlayerStore();
    s.getState().playContext([track("1"), track("2")]);
    s.getState().onPlaying();
    s.getState().setSleepTimer("track");
    s.getState().onEnded();
    expect(cur(s)).toBe("1");
    expect(s.getState().status).toBe("paused");
    expect(s.getState().sleep).toBeNull();
    // Далі — знову звичайна поведінка.
    s.getState().onEnded();
    expect(cur(s)).toBe("2");
  });
});

describe("турнір", () => {
  const songs = ["a", "b", "c", "d", "e", "f", "g", "h"];

  it("відтворює стан з виборів: пари, раунди, кількість зіграних", () => {
    let st = replayTournament(songs, []);
    expect(st.pair).toEqual(["a", "b"]);
    expect(st.rounds).toBe(3);
    st = replayTournament(songs, [0, 1, 0, 1]);
    // Чвертьфінали: a, d, e, h → півфінал a–d.
    expect(st.round).toEqual(["a", "d", "e", "h"]);
    expect(st.pair).toEqual(["a", "d"]);
    expect(st.played).toBe(4);
  });

  it("переможець, шлях, п'єдестал і рейтинг", () => {
    const st = replayTournament(songs, [0, 1, 0, 1, 1, 0, 0]);
    expect(st.champion).toBe("d");
    expect(st.pair).toBeNull();
    expect(championPath(st).map((m) => m.loser)).toEqual(["c", "a", "e"]);
    expect(podium(st)).toEqual({ first: "d", second: "e", third: ["a", "h"] });
    expect(tournamentRanking(st)).toEqual(["d", "e", "a", "h", "b", "c", "f", "g"]);
  });

  it("зайві вибори після фіналу ігноруються; крок назад — менше виборів", () => {
    const done = replayTournament(["x", "y", "z", "w"], [0, 0, 1, 1, 0]);
    expect(done.champion).toBe("z");
    expect(done.played).toBe(3);
    const back = replayTournament(["x", "y", "z", "w"], [0, 0]);
    expect(back.champion).toBeNull();
    expect(back.pair).toEqual(["x", "z"]);
  });
});

describe("ключ турніру", () => {
  it("однаковий для того самого турніру й різний для іншого", () => {
    const ids = ["a", "b", "c", "d"];
    const k = tournamentKey(ids, [0, 1, 0]);
    expect(k).toMatch(/^[0-9a-z]{14}$/);
    expect(tournamentKey(ids, [0, 1, 0])).toBe(k);
    expect(tournamentKey(ids, [0, 1, 1])).not.toBe(k);
    expect(tournamentKey(["b", "a", "c", "d"], [0, 1, 0])).not.toBe(k);
  });
});
