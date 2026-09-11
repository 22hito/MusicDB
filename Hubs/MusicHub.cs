using Microsoft.AspNetCore.SignalR;

namespace MusicDB.Api.Hubs;

// Клієнти лише слухають (пісні/заявки змінились — перезавантаж дані), нічого
// серверу не викликають, тож методів тут не потрібно — вся логіка живе в
// контролерах, які шлють через IHubContext<MusicHub> після кожної мутації.
public class MusicHub : Hub;
