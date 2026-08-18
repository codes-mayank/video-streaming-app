import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: "/api",
  credentials: "include",
});

function requestUrl(args) {
  return typeof args === "string" ? args : args.url;
}

async function baseQuery(args, api, extra) {
  let result = await rawBaseQuery(args, api, extra);
  const url = requestUrl(args);

  if (result.error?.status === 401 && url.includes("/users/auth/me")) {
    const refresh = await rawBaseQuery(
      { url: "/users/auth/refresh", method: "POST" },
      api,
      extra
    );
    if (!refresh.error) {
      result = await rawBaseQuery(args, api, extra);
    }
    if (result.error?.status === 401) {
      return { data: null };
    }
  }

  return result;
}

function cacheCurrentUser(dispatch, user) {
  dispatch(api.util.upsertQueryData("getCurrentUser", undefined, user));
}

function cacheVideosFromList(dispatch, items) {
  for (const video of items ?? []) {
    if (video?.id == null) continue;
    dispatch(api.util.upsertQueryData("getVideo", video.id, video));
  }
}

export function rtkErrorMessage(error) {
  const detail = error?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "string") return item;
        return item?.message || item?.msg || String(item);
      })
      .join(", ");
  }
  if (typeof error?.error === "string") return error.error;
  return error?.message || "Something went wrong. Please try again.";
}

function withCursor(path, { limit, cursor, extra } = {}) {
  const params = new URLSearchParams();
  if (limit != null) params.set("limit", String(limit));
  if (cursor) params.set("cursor_id", String(cursor));
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value != null && value !== "") params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

function infiniteList({ cacheKey }) {
  return {
    serializeQueryArgs: ({ queryArgs }) => cacheKey(queryArgs ?? {}),
    merge(currentCache, newItems, { arg }) {
      if (!currentCache || !arg?.cursor) return newItems;
      return {
        ...newItems,
        items: [...(currentCache.items ?? []), ...(newItems.items ?? [])],
      };
    },
    forceRefetch({ currentArg, previousArg }) {
      return (
        currentArg?.cursor !== previousArg?.cursor ||
        cacheKey(currentArg ?? {}) !== cacheKey(previousArg ?? {})
      );
    },
  };
}

export const api = createApi({
  reducerPath: "api",
  baseQuery,
  keepUnusedDataFor: 300,
  tagTypes: [
    "User",
    "Video",
    "Videos",
    "Liked",
    "WatchHistory",
    "Subscription",
    "Channel",
    "Comments",
  ],
  endpoints: (builder) => ({
    getCurrentUser: builder.query({
      query: () => "/users/auth/me",
      providesTags: ["User"],
    }),
    login: builder.mutation({
      query: (body) => ({ url: "/users/auth/login", method: "POST", body }),
      invalidatesTags: ["User", "Subscription", "Liked", "WatchHistory"],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          cacheCurrentUser(dispatch, data);
        } catch {
          /* ignore */
        }
      },
    }),
    signup: builder.mutation({
      query: (body) => ({ url: "/users/auth/signup", method: "POST", body }),
      invalidatesTags: ["User"],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          cacheCurrentUser(dispatch, data);
        } catch {
          /* ignore */
        }
      },
    }),
    googleLogin: builder.mutation({
      query: (token) => ({
        url: "/users/auth/google/login",
        method: "POST",
        body: { token },
      }),
      invalidatesTags: ["User", "Subscription", "Liked", "WatchHistory"],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          cacheCurrentUser(dispatch, data);
        } catch {
          /* ignore */
        }
      },
    }),
    logout: builder.mutation({
      query: () => ({ url: "/users/auth/logout", method: "POST" }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } finally {
          dispatch(api.util.resetApiState());
        }
      },
    }),
    mostLikedVideos: builder.query({
      query: (limit = 5) => `/videos/most-liked?limit=${limit}`,
      providesTags: ["Videos"],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          const items = Array.isArray(data) ? data : data?.items ?? [];
          cacheVideosFromList(dispatch, items);
        } catch {
          /* ignore */
        }
      },
    }),
    getLikedVideos: builder.query({
      query: ({ limit = 20, cursor } = {}) =>
        withCursor("/videos/liked-videos", { limit, cursor }),
      ...infiniteList({
        cacheKey: ({ limit = 20 } = {}) => `liked:${limit}`,
      }),
      providesTags: ["Liked"],
    }),
    getWatchHistory: builder.query({
      query: ({ limit = 20, cursor } = {}) =>
        withCursor("/videos/watch-history", { limit, cursor }),
      ...infiniteList({
        cacheKey: ({ limit = 20 } = {}) => `watch-history:${limit}`,
      }),
      providesTags: ["WatchHistory"],
    }),
    deleteWatchHistory: builder.mutation({
      query: () => ({ url: "/videos/watch-history/", method: "DELETE" }),
      invalidatesTags: ["WatchHistory"],
    }),
    addWatchHistory: builder.mutation({
      query: (videoId) => ({
        url: `/videos/${videoId}/watch-history`,
        method: "POST",
      }),
      invalidatesTags: ["WatchHistory"],
    }),
    getSubscriptions: builder.query({
      query: () => "/videos/subscriptions",
      providesTags: ["Subscription"],
    }),
    getVideos: builder.query({
      query: ({ category, limit = 15, cursor } = {}) =>
        withCursor("/videos", { limit, cursor, extra: { category } }),
      ...infiniteList({
        cacheKey: ({ category, limit = 15 } = {}) =>
          `videos:${category ?? "all"}:${limit}`,
      }),
      providesTags: ["Videos"],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          cacheVideosFromList(dispatch, data?.items);
        } catch {
          /* ignore */
        }
      },
    }),
    getVideo: builder.query({
      query: (id) => `/videos/${id}`,
      providesTags: (_res, _err, id) => [{ type: "Video", id }],
    }),
    searchVideos: builder.query({
      query: ({ query, limit = 20, cursor } = {}) =>
        withCursor("/videos/search", { limit, cursor, extra: { query } }),
      ...infiniteList({
        cacheKey: ({ query, limit = 20 } = {}) => `search:${query}:${limit}`,
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          cacheVideosFromList(dispatch, data?.items);
        } catch {
          /* ignore */
        }
      },
    }),
    subscribe: builder.mutation({
      query: (userId) => ({ url: `/videos/${userId}/subscribe`, method: "POST" }),
      invalidatesTags: (_r, _e, userId) => [
        "Subscription",
        { type: "Subscription", id: userId },
      ],
    }),
    unsubscribe: builder.mutation({
      query: (userId) => ({
        url: `/videos/${userId}/unsubscribe`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, userId) => [
        "Subscription",
        { type: "Subscription", id: userId },
      ],
    }),
    checkSubscription: builder.query({
      query: (userId) => `/videos/check-subscription/${userId}`,
      providesTags: (_r, _e, userId) => [{ type: "Subscription", id: userId }],
    }),
    getChannel: builder.query({
      query: (userId) => `/videos/channel/${userId}`,
      providesTags: (_r, _e, userId) => [{ type: "Channel", id: userId }],
    }),
    getChannelVideos: builder.query({
      query: ({ userId, limit = 15, cursor } = {}) =>
        withCursor(`/videos/channel/${userId}/videos`, { limit, cursor }),
      ...infiniteList({
        cacheKey: ({ userId, limit = 15 } = {}) =>
          `channel-videos:${userId}:${limit}`,
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          cacheVideosFromList(dispatch, data?.items);
        } catch {
          /* ignore */
        }
      },
    }),
    deleteVideo: builder.mutation({
      query: (videoId) => ({ url: `/videos/${videoId}`, method: "DELETE" }),
      invalidatesTags: ["Videos"],
    }),
    likeVideo: builder.mutation({
      query: (videoId) => ({ url: `/videos/${videoId}/like`, method: "POST" }),
      invalidatesTags: (_r, _e, videoId) => [
        { type: "Video", id: videoId },
        "Liked",
      ],
    }),
    unlikeVideo: builder.mutation({
      query: (videoId) => ({ url: `/videos/${videoId}/like`, method: "DELETE" }),
      invalidatesTags: (_r, _e, videoId) => [
        { type: "Video", id: videoId },
        "Liked",
      ],
    }),
    getComments: builder.query({
      query: ({ videoId, limit = 20, cursor } = {}) =>
        withCursor(`/videos/${videoId}/comments`, { limit, cursor }),
      ...infiniteList({
        cacheKey: ({ videoId, limit = 20 } = {}) =>
          `comments:${videoId}:${limit}`,
      }),
      providesTags: (_r, _e, arg) => [{ type: "Comments", id: arg?.videoId }],
    }),
    createComment: builder.mutation({
      query: ({ videoId, body }) => ({
        url: `/videos/${videoId}/comments`,
        method: "POST",
        body: { body },
      }),
      invalidatesTags: (_r, _e, { videoId }) => [{ type: "Comments", id: videoId }],
    }),
    deleteComment: builder.mutation({
      query: ({ videoId, commentId, clientId }) => {
        const params = new URLSearchParams();
        if (clientId) params.set("client_id", String(clientId));
        const qs = params.toString();
        return {
          url: `/videos/${videoId}/comments/${commentId}${qs ? `?${qs}` : ""}`,
          method: "DELETE",
        };
      },
      invalidatesTags: (_r, _e, { videoId }) => [{ type: "Comments", id: videoId }],
    }),
  }),
});

export const {
  useGetCurrentUserQuery,
  useLoginMutation,
  useSignupMutation,
  useGoogleLoginMutation,
  useLogoutMutation,
  useMostLikedVideosQuery,
  useGetLikedVideosQuery,
  useGetWatchHistoryQuery,
  useDeleteWatchHistoryMutation,
  useAddWatchHistoryMutation,
  useGetSubscriptionsQuery,
  useGetVideosQuery,
  useGetVideoQuery,
  useSearchVideosQuery,
  useSubscribeMutation,
  useUnsubscribeMutation,
  useCheckSubscriptionQuery,
  useGetChannelQuery,
  useGetChannelVideosQuery,
  useDeleteVideoMutation,
  useLikeVideoMutation,
  useUnlikeVideoMutation,
  useGetCommentsQuery,
  useCreateCommentMutation,
  useDeleteCommentMutation,
} = api;
