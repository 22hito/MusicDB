using Microsoft.EntityFrameworkCore;
using MusicDB.Api.Data;
using MusicDB.Api.Models;

namespace MusicDB.Api.Services;

// Схожість музичних смаків між людьми — для графа "Схожий смак" і списку "схожі на вас".
// Смак = улюблені пісні (вага 1) + прослухані (0.3), розкладені на виконавців і жанри.
// Схожість двох людей: косинус векторів виконавців і жанрів + збіг самих улюблених пісень.
public class TasteService(MusicDbContext db)
{
    public const double FavoriteWeight = 1.0;
    public const double ListenWeight = 0.3;
    private const double EdgeThreshold = 0.15;
    private const int EdgesPerNode = 5;
    private const int MaxNodes = 150;
    private const int MaxMatches = 20;

    internal sealed class Taste
    {
        public Dictionary<int, double> Artists { get; } = [];
        public Dictionary<string, double> Genres { get; } = [];
        public HashSet<int> Favorites { get; } = [];
        public double Total;
    }

    public async Task<TasteGraphDto> BuildAsync(int meId)
    {
        var users = await db.Users.Select(u => new { u.Id, u.Email }).ToListAsync();
        var idByEmail = users.ToDictionary(u => u.Email, u => u.Id, StringComparer.OrdinalIgnoreCase);

        // Вага пісні для людини: улюблена важить більше за просто прослухану.
        var weights = new Dictionary<int, Dictionary<int, double>>();
        void Add(string email, int musicId, double w)
        {
            if (!idByEmail.TryGetValue(email, out var uid)) return;
            if (!weights.TryGetValue(uid, out var m)) weights[uid] = m = [];
            m[musicId] = Math.Max(m.GetValueOrDefault(musicId), w);
        }
        foreach (var h in await db.ListeningHistory.Select(h => new { h.UserEmail, h.MusicId }).ToListAsync()) Add(h.UserEmail, h.MusicId, ListenWeight);
        var favorites = await db.Favorites.Select(f => new { f.UserEmail, f.MusicId }).ToListAsync();
        foreach (var f in favorites) Add(f.UserEmail, f.MusicId, FavoriteWeight);

        var artistRows = await db.MusicArtists.Select(ma => new { ma.MusicId, ma.ArtistId, ma.Artist.Name }).ToListAsync();
        var artistsByMusic = artistRows.ToLookup(r => r.MusicId, r => r.ArtistId);
        var artistNames = artistRows.GroupBy(r => r.ArtistId).ToDictionary(g => g.Key, g => g.First().Name);
        var genreRows = await db.MusicGenres.Select(mg => new { mg.MusicId, mg.Genre.GenreName }).ToListAsync();
        var genresByMusic = genreRows.ToLookup(r => r.MusicId, r => GenreNames.Key(r.GenreName));
        // Ключ жанру -> назва для показу (перше написання з бази).
        var genreNames = genreRows.GroupBy(r => GenreNames.Key(r.GenreName)).ToDictionary(g => g.Key, g => g.First().GenreName.Trim());

        var tastes = new Dictionary<int, Taste>();
        foreach (var (uid, songs) in weights)
        {
            var t = new Taste();
            foreach (var (musicId, w) in songs)
            {
                if (w >= FavoriteWeight) t.Favorites.Add(musicId);
                t.Total += w;
                foreach (var a in artistsByMusic[musicId]) t.Artists[a] = t.Artists.GetValueOrDefault(a) + w;
                foreach (var g in genresByMusic[musicId]) t.Genres[g] = t.Genres.GetValueOrDefault(g) + w;
            }
            tastes[uid] = t;
        }

        // У граф — люди, у кого є хоч якийсь смак (улюблена пісня або кілька прослуханих),
        // найактивніші; я — завжди, якщо маю дані.
        var nodeIds = tastes.Where(kv => kv.Value.Total >= FavoriteWeight || kv.Key == meId)
            .OrderByDescending(kv => kv.Key == meId).ThenByDescending(kv => kv.Value.Total)
            .Take(MaxNodes).Select(kv => kv.Key).ToList();

        var cards = await UserDirectoryService.GetUserCardsAsync(db, nodeIds);
        var relations = await RelationsAsync(meId);
        tastes.TryGetValue(meId, out var myTaste);

        var nodes = nodeIds.Where(cards.ContainsKey).Select(id => new TasteNodeDto(
            id, cards[id].DisplayName, cards[id].AvatarUrl,
            TopArtists(tastes[id], artistNames, 3), id == meId,
            id == meId ? "self" : relations.GetValueOrDefault(id, "none"),
            id == meId ? 100 : myTaste is null ? 0 : (int)Math.Round(Similarity(myTaste, tastes[id]) * 100),
            weights[id].Count)).ToList();

        var ids = nodes.Select(n => n.UserId).ToList();
        var edges = new Dictionary<(int, int), double>();
        foreach (var a in ids)
        {
            var best = ids.Where(b => b != a)
                .Select(b => (b, s: Similarity(tastes[a], tastes[b])))
                .Where(x => x.s >= EdgeThreshold)
                .OrderByDescending(x => x.s).Take(EdgesPerNode);
            foreach (var (b, s) in best) edges[a < b ? (a, b) : (b, a)] = Math.Round(s, 3);
        }

        var matches = new List<TasteMatchDto>();
        if (tastes.TryGetValue(meId, out var mine))
        {
            matches = ids.Where(id => id != meId)
                .Select(id => (id, s: Similarity(mine, tastes[id])))
                .Where(x => x.s > 0)
                .OrderByDescending(x => x.s).Take(MaxMatches)
                .Select(x => new TasteMatchDto(
                    x.id, cards[x.id].DisplayName, cards[x.id].AvatarUrl, (int)Math.Round(x.s * 100),
                    SharedArtists(mine, tastes[x.id], artistNames, 3),
                    mine.Favorites.Count(tastes[x.id].Favorites.Contains),
                    relations.GetValueOrDefault(x.id, "none")))
                .ToList();
        }

        return new TasteGraphDto(meId, mine is null ? 0 : weights[meId].Count, nodes,
            edges.Select(e => new TasteEdgeDto(e.Key.Item1, e.Key.Item2, e.Value)).ToList(), matches,
            mine is null ? [] : TopArtists(mine, artistNames, 6),
            mine is null ? [] : mine.Genres.OrderByDescending(kv => kv.Value).Take(5).Select(kv => genreNames.GetValueOrDefault(kv.Key, kv.Key)).ToArray(),
            mine?.Favorites.Count ?? 0);
    }

    // 0..1. Без улюблених в одного з двох — лише виконавці й жанри (прослухане).
    internal static double Similarity(Taste a, Taste b)
    {
        var artists = Cosine(a.Artists, b.Artists);
        var genres = Cosine(a.Genres, b.Genres);
        if (a.Favorites.Count == 0 || b.Favorites.Count == 0) return 0.65 * artists + 0.35 * genres;
        var inter = a.Favorites.Count(b.Favorites.Contains);
        var favorites = (double)inter / (a.Favorites.Count + b.Favorites.Count - inter);
        return 0.55 * artists + 0.30 * genres + 0.15 * favorites;
    }

    private static double Cosine<TKey>(Dictionary<TKey, double> a, Dictionary<TKey, double> b) where TKey : notnull
    {
        if (a.Count == 0 || b.Count == 0) return 0;
        double dot = 0;
        foreach (var (k, v) in a.Count <= b.Count ? a : b)
            if ((a.Count <= b.Count ? b : a).TryGetValue(k, out var w)) dot += v * w;
        if (dot == 0) return 0;
        return dot / (Math.Sqrt(a.Values.Sum(v => v * v)) * Math.Sqrt(b.Values.Sum(v => v * v)));
    }

    private static ArtistRefDto[] TopArtists(Taste t, Dictionary<int, string> names, int n) =>
        t.Artists.OrderByDescending(kv => kv.Value).Take(n).Select(kv => new ArtistRefDto(kv.Key, names[kv.Key])).ToArray();

    private static ArtistRefDto[] SharedArtists(Taste a, Taste b, Dictionary<int, string> names, int n) =>
        a.Artists.Where(kv => b.Artists.ContainsKey(kv.Key))
            .OrderByDescending(kv => Math.Min(kv.Value, b.Artists[kv.Key]))
            .Take(n).Select(kv => new ArtistRefDto(kv.Key, names[kv.Key])).ToArray();

    private async Task<Dictionary<int, string>> RelationsAsync(int meId)
    {
        var rows = await db.FriendRequests.Where(r => r.RequesterId == meId || r.AddresseeId == meId).ToListAsync();
        var result = new Dictionary<int, string>();
        foreach (var r in rows)
        {
            var other = r.RequesterId == meId ? r.AddresseeId : r.RequesterId;
            result[other] = r.Status == "accepted" ? "friends" : r.RequesterId == meId ? "pending_outgoing" : "pending_incoming";
        }
        return result;
    }
}
