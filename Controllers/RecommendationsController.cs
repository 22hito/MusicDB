using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MusicDB.Api.Models;
using MusicDB.Api.Services;

namespace MusicDB.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class RecommendationsController(RecommendationService recommendationService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<RecommendationDto>>> Get([FromQuery] string lang = "uk")
    {
        var email = User.FindFirstValue(ClaimTypes.Email) ?? "";
        return Ok(await recommendationService.GetRecommendationsAsync(email, lang));
    }
}
