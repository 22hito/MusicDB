using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.AspNetCore.Mvc;

namespace MusicDB.Api.Services;

// Файли пісень ком'юніті. Дві реалізації за одним інтерфейсом:
// - LocalAudioStorage — диск (локальна розробка; на Azure — %HOME%\data);
// - R2AudioStorage — Cloudflare R2 (прод): вмикається, щойно в конфігурації
//   заповнено Uploads:R2 (див. Program.cs). Віддача файлу — редирект на
//   тимчасове підписане посилання, тож браузер тягне аудіо напряму з R2
//   (безкоштовний egress), а не через App Service.
public interface IAudioStorage
{
    // null + error — файл не прийнято (розмір/формат); інакше ім'я збереженого файлу.
    Task<(string? FileName, string? Error)> SaveAsync(IFormFile file);

    // null — файла нема або ім'я підозріле.
    Task<AudioSource?> OpenAsync(string? fileName);

    Task DeleteAsync(string? fileName);
}

// Або локальний шлях (віддаємо PhysicalFile з Range), або URL для редиректу.
public record AudioSource(string? FilePath, string? RedirectUrl, string ContentType);

public static class AudioFiles
{
    public const long MaxBytes = 25L * 1024 * 1024; // запас під ліміт IIS у ~28.6 МБ
    public const long MaxRequestBytes = MaxBytes + 1024 * 1024; // файл + поля форми

    private static readonly Dictionary<string, string> ContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        [".mp3"] = "audio/mpeg",
        [".m4a"] = "audio/mp4",
        [".aac"] = "audio/aac",
        [".ogg"] = "audio/ogg",
        [".oga"] = "audio/ogg",
        [".opus"] = "audio/ogg",
        [".wav"] = "audio/wav",
        [".flac"] = "audio/flac",
        [".webm"] = "audio/webm",
    };

    // Власне ім'я (GUID) — ім'я від клієнта ніколи не стає шляхом/ключем.
    public static (string? NewName, string? Error) Validate(IFormFile file)
    {
        if (file.Length == 0) return (null, "Empty file.");
        if (file.Length > MaxBytes) return (null, $"File is larger than {MaxBytes / 1024 / 1024} MB.");
        var ext = Path.GetExtension(file.FileName);
        if (string.IsNullOrEmpty(ext) || !ContentTypes.ContainsKey(ext)) return (null, "Unsupported audio format.");
        return ($"{Guid.NewGuid():N}{ext.ToLowerInvariant()}", null);
    }

    // Захист від ../ та інших сюрпризів у значенні з БД.
    public static bool IsSafeName(string? fileName) =>
        !string.IsNullOrWhiteSpace(fileName) && fileName == Path.GetFileName(fileName);

    public static string GetContentType(string fileName) =>
        ContentTypes.GetValueOrDefault(Path.GetExtension(fileName), "application/octet-stream");

    // Спільна відповідь для /api/songs/{id}/audio і /api/requests/{id}/audio.
    public static IActionResult ToResult(this ControllerBase controller, AudioSource? source) => source switch
    {
        null => controller.NotFound(),
        { RedirectUrl: { } url } => controller.Redirect(url),
        _ => controller.PhysicalFile(source.FilePath!, source.ContentType, enableRangeProcessing: true)
    };
}

public class LocalAudioStorage : IAudioStorage
{
    private readonly string _root;

    // На Azure App Service — %HOME%\data: цей каталог переживає ZipDeploy (на
    // відміну від site\wwwroot). Локально — App_Data поруч із застосунком.
    // Шлях можна перевизначити через Uploads:AudioPath.
    public LocalAudioStorage(IConfiguration config, IWebHostEnvironment env)
    {
        var configured = config["Uploads:AudioPath"];
        var home = Environment.GetEnvironmentVariable("HOME");
        _root = !string.IsNullOrWhiteSpace(configured)
            ? configured
            : !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("WEBSITE_SITE_NAME")) && !string.IsNullOrEmpty(home)
                ? Path.Combine(home, "data", "musicdb-audio")
                : Path.Combine(env.ContentRootPath, "App_Data", "audio");
        Directory.CreateDirectory(_root);
    }

    public async Task<(string? FileName, string? Error)> SaveAsync(IFormFile file)
    {
        var (name, error) = AudioFiles.Validate(file);
        if (name is null) return (null, error);
        await using var stream = File.Create(Path.Combine(_root, name));
        await file.CopyToAsync(stream);
        return (name, null);
    }

    public Task<AudioSource?> OpenAsync(string? fileName)
    {
        if (!AudioFiles.IsSafeName(fileName)) return Task.FromResult<AudioSource?>(null);
        var path = Path.Combine(_root, fileName!);
        return Task.FromResult(File.Exists(path) ? new AudioSource(path, null, AudioFiles.GetContentType(path)) : null);
    }

    public Task DeleteAsync(string? fileName)
    {
        if (!AudioFiles.IsSafeName(fileName)) return Task.CompletedTask;
        try { File.Delete(Path.Combine(_root, fileName!)); } catch (IOException) { /* файл зайнятий читанням */ }
        return Task.CompletedTask;
    }
}

public class R2Options
{
    public string? AccountId { get; set; }
    public string? AccessKeyId { get; set; }
    public string? SecretAccessKey { get; set; }
    public string? Bucket { get; set; }
    // Необов'язково: публічний домен бакета (власний домен у Cloudflare або
    // r2.dev). Якщо задано — віддаємо прямі посилання замість підписаних.
    public string? PublicBaseUrl { get; set; }

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(AccountId) && !string.IsNullOrWhiteSpace(AccessKeyId) &&
        !string.IsNullOrWhiteSpace(SecretAccessKey) && !string.IsNullOrWhiteSpace(Bucket);

    public string Endpoint => $"https://{AccountId}.r2.cloudflarestorage.com";
}

public sealed class R2AudioStorage : IAudioStorage, IDisposable
{
    // Скільки живе підписане посилання: з запасом на довгу пісню на паузі,
    // але недостатньо, щоб посилання мало сенс роздавати назовні.
    private static readonly TimeSpan LinkLifetime = TimeSpan.FromHours(6);

    private readonly IAmazonS3 _s3;
    private readonly string _bucket;
    private readonly string? _publicBaseUrl;
    private readonly ILogger<R2AudioStorage> _logger;

    public R2AudioStorage(R2Options options, ILogger<R2AudioStorage> logger)
    {
        _bucket = options.Bucket!;
        _publicBaseUrl = string.IsNullOrWhiteSpace(options.PublicBaseUrl) ? null : options.PublicBaseUrl.TrimEnd('/');
        _logger = logger;
        _s3 = new AmazonS3Client(
            new BasicAWSCredentials(options.AccessKeyId, options.SecretAccessKey),
            new AmazonS3Config
            {
                ServiceURL = options.Endpoint,
                ForcePathStyle = true,
                AuthenticationRegion = "auto",
                // R2 не підтримує всі нові контрольні суми S3, які SDK шле за замовчуванням.
                RequestChecksumCalculation = RequestChecksumCalculation.WHEN_REQUIRED,
                ResponseChecksumValidation = ResponseChecksumValidation.WHEN_REQUIRED,
            });
    }

    public async Task<(string? FileName, string? Error)> SaveAsync(IFormFile file)
    {
        var (name, error) = AudioFiles.Validate(file);
        if (name is null) return (null, error);

        await using var stream = file.OpenReadStream();
        await _s3.PutObjectAsync(new PutObjectRequest
        {
            BucketName = _bucket,
            Key = name,
            InputStream = stream,
            ContentType = AudioFiles.GetContentType(name),
            // Рекомендація Cloudflare для .NET SDK: R2 не приймає підпис потокового тіла.
            DisablePayloadSigning = true,
            DisableDefaultChecksumValidation = true,
        });
        return (name, null);
    }

    public async Task<AudioSource?> OpenAsync(string? fileName)
    {
        if (!AudioFiles.IsSafeName(fileName)) return null;
        var contentType = AudioFiles.GetContentType(fileName!);
        if (_publicBaseUrl is not null)
            return new AudioSource(null, $"{_publicBaseUrl}/{Uri.EscapeDataString(fileName!)}", contentType);

        // Підпис рахується локально — без звернення до R2 на кожне прослуховування.
        var url = await _s3.GetPreSignedURLAsync(new GetPreSignedUrlRequest
        {
            BucketName = _bucket,
            Key = fileName,
            Verb = HttpVerb.GET,
            Protocol = Protocol.HTTPS,
            Expires = DateTime.UtcNow.Add(LinkLifetime),
        });
        return new AudioSource(null, url, contentType);
    }

    public async Task DeleteAsync(string? fileName)
    {
        if (!AudioFiles.IsSafeName(fileName)) return;
        try
        {
            await _s3.DeleteObjectAsync(_bucket, fileName);
        }
        catch (AmazonS3Exception e)
        {
            // Запис у БД уже видалено — осиротілий об'єкт у бакеті не критичний.
            _logger.LogWarning(e, "Failed to delete {File} from R2", fileName);
        }
    }

    public void Dispose() => _s3.Dispose();
}
