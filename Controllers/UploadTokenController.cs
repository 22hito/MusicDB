using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MusicDB.Api.Services;

namespace MusicDB.Api.Controllers;

// Короткоживучий токен для завантаження файлів нативним клієнтом (див. UploadTokenAuth).
// Видається лише за звичайною cookie-сесією — сам токеном отримати інший не можна.
[ApiController]
[Route("api/upload-token")]
[Authorize(AuthenticationSchemes = Microsoft.AspNetCore.Authentication.Cookies.CookieAuthenticationDefaults.AuthenticationScheme)]
public class UploadTokenController(UploadTokenService tokens) : ControllerBase
{
    [HttpPost]
    public IActionResult Create() =>
        Ok(new { token = tokens.Create(User), expiresInSeconds = (int)UploadTokenService.Lifetime.TotalSeconds });
}
