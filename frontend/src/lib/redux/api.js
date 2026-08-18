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
  tagTypes: ["User", "Video", "Liked", "WatchHistory"],
  endpoints: (builder) => ({
    getCurrentUser: builder.query({
      query: () => "/users/auth/me",
      providesTags: ["User"],
    }),
    login: builder.mutation({
      query: (body) => ({ url: "/users/auth/login", method: "POST", body }),
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
        providesTags: ["Video"],
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
} = api;
