/**
 * React-шар SDK — однаковий для сайту й мобільного застосунку:
 * провайдер, універсальні хуки запитів і доменні хуки з оптимістичними оновленнями.
 */
import {
  type EndpointDef,
  type EndpointInput,
  type EndpointOutput,
  endpoints,
  type Me,
  type Page,
  type RealtimeEvent,
} from "@musicdb/contracts/client";
import {
  type InfiniteData,
  type QueryClient,
  type UseQueryOptions,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { createContext, type ReactNode, useContext, useMemo } from "react";
import { type Api, ApiError, type Client } from "../client";

const ApiContext = createContext<Client | null>(null);

export function ApiProvider({ client, children }: { client: Client; children: ReactNode }) {
  return <ApiContext.Provider value={client}>{children}</ApiContext.Provider>;
}

export function useClient(): Client {
  const client = useContext(ApiContext);
  if (!client) throw new Error("ApiProvider відсутній");
  return client;
}

export function useApi(): Api {
  return useClient().api;
}

// ─── Ключі кешу ───────────────────────────────────────────────────────────

export const keyOf = (e: EndpointDef) => `${e.method} ${e.path}`;

export function queryKey<E extends EndpointDef>(e: E, input?: EndpointInput<E>) {
  return [keyOf(e), input?.params ?? null, input?.query ?? null] as const;
}

/** Інвалідує всі запити до ендпоінта (з будь-якими параметрами). */
export function invalidate(qc: QueryClient, ...defs: EndpointDef[]) {
  return Promise.all(defs.map((e) => qc.invalidateQueries({ queryKey: [keyOf(e)] })));
}

// ─── Універсальні хуки ────────────────────────────────────────────────────

type QueryOpts<T> = Omit<UseQueryOptions<T, ApiError>, "queryKey" | "queryFn">;

export function useEndpoint<E extends EndpointDef>(
  e: E,
  input?: EndpointInput<E>,
  options: QueryOpts<EndpointOutput<E>> = {},
) {
  const { call } = useClient();
  return useQuery<EndpointOutput<E>, ApiError>({
    queryKey: queryKey(e, input),
    queryFn: ({ signal }) => call(e, input, { signal }),
    ...options,
  });
}

/** Нескінченний список для ендпоінтів із курсорною пагінацією. */
export function useInfiniteEndpoint<E extends EndpointDef>(
  e: E,
  input?: EndpointInput<E>,
  options: { enabled?: boolean } = {},
) {
  const { call } = useClient();
  type Out = EndpointOutput<E> & Page<unknown>;
  return useInfiniteQuery<Out, ApiError, InfiniteData<Out>, readonly unknown[], string | null>({
    queryKey: [...queryKey(e, input), "infinite"],
    initialPageParam: null,
    queryFn: ({ pageParam, signal }) =>
      call(
        e,
        {
          ...(input ?? {}),
          query: {
            ...((input?.query as object | undefined) ?? {}),
            ...(pageParam ? { cursor: pageParam } : {}),
          },
        } as EndpointInput<E>,
        { signal },
      ) as Promise<Out>,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    ...(options.enabled !== undefined ? { enabled: options.enabled } : {}),
  });
}

// ─── Поточний користувач ──────────────────────────────────────────────────

/** null — гість (401 не вважається помилкою). */
export function useMe() {
  const { call } = useClient();
  return useQuery<Me | null, ApiError>({
    queryKey: queryKey(endpoints.me.get),
    queryFn: async ({ signal }) => {
      try {
        return await call(endpoints.me.get, undefined, { signal });
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }
    },
    staleTime: 60_000,
  });
}

export function useIsSignedIn() {
  return !!useMe().data;
}

export function useBadges() {
  const signedIn = useIsSignedIn();
  return useEndpoint(endpoints.me.badges, undefined, {
    enabled: signedIn,
    staleTime: 30_000,
    refetchInterval: 120_000,
  });
}

export function useLibrary() {
  const signedIn = useIsSignedIn();
  return useEndpoint(endpoints.library.overview, undefined, { enabled: signedIn, staleTime: 60_000 });
}

// ─── Вподобання (миттєво, з відкатом при помилці) ─────────────────────────

export function useLikedIds() {
  const signedIn = useIsSignedIn();
  const q = useEndpoint(endpoints.library.likedIds, undefined, { enabled: signedIn, staleTime: 5 * 60_000 });
  const set = useMemo(() => new Set(q.data?.ids ?? []), [q.data]);
  return set;
}

export function useToggleLike() {
  const { call } = useClient();
  const qc = useQueryClient();
  const key = queryKey(endpoints.library.likedIds);
  return useMutation({
    mutationFn: async ({ trackId, liked }: { trackId: string; liked: boolean }) => {
      if (liked) await call(endpoints.library.likeTrack, { params: { id: trackId } });
      else await call(endpoints.library.unlikeTrack, { params: { id: trackId } });
    },
    onMutate: async ({ trackId, liked }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<{ ids: string[] }>(key);
      qc.setQueryData<{ ids: string[] }>(key, (old) => {
        const ids = new Set(old?.ids ?? []);
        if (liked) ids.add(trackId);
        else ids.delete(trackId);
        return { ids: [...ids] };
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSettled: () => invalidate(qc, endpoints.library.likedTracks, endpoints.library.overview),
  });
}

// ─── Підписки й збереження ────────────────────────────────────────────────

export function useFollowArtist() {
  const { call } = useClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ artistId, follow }: { artistId: string; follow: boolean }) => {
      if (follow) await call(endpoints.library.followArtist, { params: { id: artistId } });
      else await call(endpoints.library.unfollowArtist, { params: { id: artistId } });
    },
    onSuccess: () => invalidate(qc, endpoints.artists.get, endpoints.library.overview),
  });
}

export function useSaveRelease() {
  const { call } = useClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ releaseId, save }: { releaseId: string; save: boolean }) => {
      if (save) await call(endpoints.library.saveRelease, { params: { id: releaseId } });
      else await call(endpoints.library.unsaveRelease, { params: { id: releaseId } });
    },
    onSuccess: () => invalidate(qc, endpoints.releases.get, endpoints.library.overview),
  });
}

export function useFollowUser() {
  const { call } = useClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, follow }: { userId: string; follow: boolean }) => {
      if (follow) await call(endpoints.users.follow, { params: { id: userId } });
      else await call(endpoints.users.unfollow, { params: { id: userId } });
    },
    onSuccess: () =>
      invalidate(qc, endpoints.users.get, endpoints.users.followers, endpoints.users.following),
  });
}

// ─── Плейлисти ────────────────────────────────────────────────────────────

export function usePlaylistActions() {
  const { call } = useClient();
  const qc = useQueryClient();
  const refresh = () => invalidate(qc, endpoints.playlists.get, endpoints.library.overview);
  return {
    create: useMutation({
      mutationFn: (body: EndpointInput<typeof endpoints.playlists.create>["body"]) =>
        call(endpoints.playlists.create, { body }),
      onSuccess: refresh,
    }),
    update: useMutation({
      mutationFn: ({
        id,
        ...body
      }: { id: string } & EndpointInput<typeof endpoints.playlists.update>["body"]) =>
        call(endpoints.playlists.update, { params: { id }, body }),
      onSuccess: refresh,
    }),
    remove: useMutation({
      mutationFn: (id: string) => call(endpoints.playlists.delete, { params: { id } }),
      onSuccess: refresh,
    }),
    addTracks: useMutation({
      mutationFn: ({
        id,
        trackIds,
        afterItemId,
      }: {
        id: string;
        trackIds: string[];
        afterItemId?: string | null;
      }) =>
        call(endpoints.playlists.addItems, {
          params: { id },
          body: { trackIds, ...(afterItemId !== undefined ? { afterItemId } : {}) },
        }),
      onSuccess: refresh,
    }),
    removeItem: useMutation({
      mutationFn: ({ id, itemId }: { id: string; itemId: string }) =>
        call(endpoints.playlists.removeItem, { params: { id, itemId } }),
      onSuccess: refresh,
    }),
    moveItem: useMutation({
      mutationFn: ({ id, itemId, afterItemId }: { id: string; itemId: string; afterItemId: string | null }) =>
        call(endpoints.playlists.moveItem, { params: { id, itemId }, body: { afterItemId } }),
      onSuccess: refresh,
    }),
    follow: useMutation({
      mutationFn: async ({ id, follow }: { id: string; follow: boolean }) => {
        if (follow) await call(endpoints.playlists.follow, { params: { id } });
        else await call(endpoints.playlists.unfollow, { params: { id } });
      },
      onSuccess: refresh,
    }),
  };
}

// ─── Реалтайм → кеш ───────────────────────────────────────────────────────

/** Оновлює кеш запитів за подіями сервера — відкриті екрани змінюються без перезавантаження. */
export function applyRealtimeEvent(qc: QueryClient, event: RealtimeEvent) {
  switch (event.type) {
    case "notification":
      void invalidate(qc, endpoints.notifications.list, endpoints.me.badges);
      break;
    case "message":
      void invalidate(
        qc,
        endpoints.conversations.messages,
        endpoints.conversations.list,
        endpoints.conversations.get,
        endpoints.me.badges,
      );
      break;
    case "conversation.read":
      void invalidate(qc, endpoints.conversations.get, endpoints.conversations.list);
      break;
    case "badges.changed":
      void invalidate(qc, endpoints.me.badges);
      break;
    case "library.changed":
      if (event.scope === "likes")
        void invalidate(qc, endpoints.library.likedIds, endpoints.library.likedTracks);
      void invalidate(qc, endpoints.library.overview);
      break;
    case "playlist.changed":
      void qc.invalidateQueries({ queryKey: [keyOf(endpoints.playlists.get), { id: event.playlistId }] });
      void invalidate(qc, endpoints.library.overview);
      break;
    case "upload.status":
      void qc.invalidateQueries({ queryKey: [keyOf(endpoints.uploads.status), { id: event.uploadId }] });
      break;
    case "catalog.changed":
      void invalidate(qc, endpoints.tracks.get, endpoints.discover.home);
      break;
    case "moderation.changed":
      void invalidate(
        qc,
        endpoints.admin.submissions,
        endpoints.admin.reports,
        endpoints.admin.bugReports,
        endpoints.me.badges,
      );
      break;
    default:
      break;
  }
}

export { ApiError };
