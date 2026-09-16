using Microsoft.AspNetCore.SignalR;

namespace MusicDB.Api.Hubs;

// Клієнти лише слухають — уся логіка живе в контролерах (IHubContext<MusicHub>).
public class MusicHub : Hub;
