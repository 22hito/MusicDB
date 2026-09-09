# Продакшн-образ для MusicDB.Api. Використовується Render/Railway/Fly.io
# (і будь-яким іншим хостингом, що вміє збирати Docker-образи) — не
# залежить від того, чи хостинг сам вміє native .NET runtime.

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY MusicDB.Api.csproj ./
RUN dotnet restore MusicDB.Api.csproj
COPY . .
RUN dotnet publish MusicDB.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app .
ENV ASPNETCORE_ENVIRONMENT=Production
ENTRYPOINT ["dotnet", "MusicDB.Api.dll"]
