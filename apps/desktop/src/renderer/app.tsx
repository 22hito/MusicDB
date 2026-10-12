/**
 * Маршрути застосунку. Сторінки — ті самі компоненти, що й на сайті; дані сторінок пісні, альбому,
 * виконавця тощо, які на сайті приходять із сервера, тут завантажуються перед показом.
 */
import { endpoints } from "@musicdb/contracts/client";
import type { Locale } from "@musicdb/i18n";
import { useEndpoint } from "@musicdb/sdk/react";
import type { ReactNode } from "react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Outlet, Route, Routes, useParams } from "react-router";
import { AdminView } from "@/components/pages/admin";
import { AlbumView } from "@/components/pages/album";
import { ArtistView } from "@/components/pages/artist";
import { AuthForm } from "@/components/pages/auth";
import { BattleView } from "@/components/pages/battle";
import { CatalogView } from "@/components/pages/catalog";
import { GenreView, LibraryView, LikedSongsView } from "@/components/pages/collections";
import { CommunityView, ThreadView } from "@/components/pages/community";
import { ArtistsView, ExploreView, RecommendationsView, TopView } from "@/components/pages/discover";
import { FollowList } from "@/components/pages/follow-list";
import { HomeView } from "@/components/pages/home";
import { MessagesView } from "@/components/pages/messages";
import { NotificationsView } from "@/components/pages/notifications";
import { PlaylistView } from "@/components/pages/playlist";
import { PremiumView } from "@/components/pages/premium";
import { ProfileView } from "@/components/pages/profile";
import { SearchView } from "@/components/pages/search";
import { SettingsView } from "@/components/pages/settings";
import { StatsView } from "@/components/pages/stats";
import { TasteView } from "@/components/pages/taste";
import { TimeMachineView } from "@/components/pages/time-machine";
import { TrackView } from "@/components/pages/track";
import { UploadView } from "@/components/pages/upload";
import { WheelView } from "@/components/pages/wheel";
import { Providers } from "@/components/providers";
import { AppShell } from "@/components/shell/app-shell";
import { RightPanel } from "@/components/shell/right-panel";
import { useT } from "@/lib/i18n";
import { DesktopBridge } from "./bridge";
import { TitleBar } from "./title-bar";

function Shell() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

function Missing() {
  const t = useT();
  return <p className="py-24 text-center text-lg text-muted">{t("common.notFound")}</p>;
}

function Loading() {
  return (
    <div className="space-y-4 p-6">
      <div className="skeleton h-56 rounded-2xl" />
      <div className="skeleton h-10 w-1/2 rounded-lg" />
      <div className="skeleton h-80 rounded-2xl" />
    </div>
  );
}

/** Завантажити сутність за :id з адреси й показати сторінку, коли дані є. */
function Detail<T>({
  load,
  render,
}: {
  load: (id: string) => { data: T | undefined; isError: boolean };
  render: (id: string, data: T) => ReactNode;
}) {
  const { id = "" } = useParams();
  const { data, isError } = load(id);
  if (isError) return <Missing />;
  if (!data) return <Loading />;
  return <>{render(id, data)}</>;
}

const useTrack = (id: string) => useEndpoint(endpoints.tracks.get, { params: { id } });
const useArtist = (id: string) => useEndpoint(endpoints.artists.get, { params: { id } });
const useRelease = (id: string) => useEndpoint(endpoints.releases.get, { params: { id } });
const usePlaylist = (id: string) => useEndpoint(endpoints.playlists.get, { params: { id } });
const useGenre = (id: string) => useEndpoint(endpoints.genres.get, { params: { id } });
const useProfile = (id: string) => useEndpoint(endpoints.users.get, { params: { id } });

function Id({ children }: { children: (id: string) => ReactNode }) {
  const { id = "" } = useParams();
  return <>{children(id)}</>;
}

function App({ locale }: { locale: Locale }) {
  return (
    <Providers locale={locale}>
      <TitleBar />
      <DesktopBridge />
      <Routes>
        <Route path="/login" element={<AuthForm mode="login" />} />
        <Route path="/signup" element={<AuthForm mode="signup" />} />
        <Route element={<Shell />}>
          <Route index element={<HomeView />} />
          <Route path="search" element={<SearchView />} />
          <Route path="explore" element={<ExploreView />} />
          <Route path="top" element={<TopView />} />
          <Route path="artists" element={<ArtistsView />} />
          <Route path="recommendations" element={<RecommendationsView />} />
          <Route path="catalog" element={<CatalogView />} />
          <Route path="library" element={<LibraryView />} />
          <Route path="collection/tracks" element={<LikedSongsView />} />
          <Route path="community" element={<CommunityView />} />
          <Route path="community/:id" element={<Id>{(id) => <ThreadView id={id} />}</Id>} />
          <Route path="messages" element={<MessagesView />} />
          <Route path="messages/:id" element={<Id>{(id) => <MessagesView conversationId={id} />}</Id>} />
          <Route path="notifications" element={<NotificationsView />} />
          <Route path="settings" element={<SettingsView />} />
          <Route path="stats" element={<StatsView />} />
          <Route path="taste" element={<TasteView />} />
          <Route path="time-machine" element={<TimeMachineView />} />
          <Route path="upload" element={<UploadView />} />
          <Route path="wheel" element={<WheelView />} />
          <Route path="battle" element={<BattleView />} />
          <Route path="admin" element={<AdminView />} />
          <Route path="premium" element={<PremiumView />} />
          <Route
            path="queue"
            element={
              <div className="h-[calc(100dvh-200px)] px-2">
                <RightPanel panel="queue" />
              </div>
            }
          />
          <Route
            path="track/:id"
            element={
              <Detail load={useTrack} render={(id, d) => <TrackView key={id} id={id} initial={d} />} />
            }
          />
          <Route
            path="artist/:id"
            element={
              <Detail load={useArtist} render={(id, d) => <ArtistView key={id} id={id} initial={d} />} />
            }
          />
          <Route
            path="album/:id"
            element={
              <Detail load={useRelease} render={(id, d) => <AlbumView key={id} id={id} initial={d} />} />
            }
          />
          <Route
            path="playlist/:id"
            element={
              <Detail load={usePlaylist} render={(id, d) => <PlaylistView key={id} id={id} initial={d} />} />
            }
          />
          <Route
            path="genre/:id"
            element={
              <Detail load={useGenre} render={(id, d) => <GenreView key={id} slug={d.slug} initial={d} />} />
            }
          />
          <Route
            path="user/:id"
            element={
              <Detail load={useProfile} render={(id, d) => <ProfileView key={id} id={id} initial={d} />} />
            }
          />
          <Route
            path="user/:id/followers"
            element={<Id>{(id) => <FollowList id={id} kind="followers" />}</Id>}
          />
          <Route
            path="user/:id/following"
            element={<Id>{(id) => <FollowList id={id} kind="following" />}</Id>}
          />
          <Route path="*" element={<Missing />} />
        </Route>
      </Routes>
    </Providers>
  );
}

export function mount(el: HTMLElement) {
  const locale = (document.documentElement.lang === "en" ? "en" : "uk") as Locale;
  createRoot(el).render(
    <StrictMode>
      <BrowserRouter>
        <App locale={locale} />
      </BrowserRouter>
    </StrictMode>,
  );
}
