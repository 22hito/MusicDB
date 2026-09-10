using System.Net;
using System.Text;

namespace MusicDB.Api.Tests;

// Підмінює HTTP-транспорт фіксованою JSON-відповіддю — тести перевіряють
// логіку сортування/фільтрації ExternalMusicSearchService без звернення
// до реального iTunes API.
public class FakeHttpMessageHandler(string jsonResponse) : HttpMessageHandler
{
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var response = new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(jsonResponse, Encoding.UTF8, "application/json")
        };
        return Task.FromResult(response);
    }
}
