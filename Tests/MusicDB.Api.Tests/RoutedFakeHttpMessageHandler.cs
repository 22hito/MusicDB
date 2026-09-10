using System.Net;
using System.Text;

namespace MusicDB.Api.Tests;

// Маршрутизує фіксовані JSON-відповіді за підрядком в URL (напр. "/search" чи
// "/lookup") — потрібно для тестів, де ExternalMusicSearchService звертається
// до двох різних iTunes-ендпоінтів в межах одного виклику SearchAsync.
public class RoutedFakeHttpMessageHandler(params (string UrlContains, string Json)[] routes) : HttpMessageHandler
{
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var url = request.RequestUri!.ToString();
        var json = routes.FirstOrDefault(r => url.Contains(r.UrlContains)).Json
            ?? """{"resultCount":0,"results":[]}""";

        var response = new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        };
        return Task.FromResult(response);
    }
}
