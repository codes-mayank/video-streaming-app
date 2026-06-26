"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";
import "videojs-contrib-quality-levels";

function qualityLabel(level, index) {
  if (level.height) return `${level.height}p`;
  if (level.width) return `${level.width}w`;
  return `Level ${index + 1}`;
}

function isHlsSource(sources) {
  const source = sources?.[0];
  if (!source) return false;
  return (
    source.type === "application/x-mpegURL" ||
    source.type === "application/vnd.apple.mpegurl" ||
    source.src?.includes(".m3u8")
  );
}

function getSourceKey(sources) {
  const source = sources?.[0];
  if (!source) return "";
  return `${source.src ?? ""}|${source.type ?? ""}`;
}

function withHlsDefaults(options, hlsPlayback) {
  if (!hlsPlayback) return options;

  return {
    ...options,
    html5: {
      ...options?.html5,
      vhs: {
        ...options?.html5?.vhs,
        // Native HLS (Safari) does not populate quality levels; force VHS instead.
        overrideNative: true,
      },
    },
  };
}

function parseMasterPlaylistVariants(text) {
  const variants = [];
  const lines = text.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line.startsWith("#EXT-X-STREAM-INF:")) continue;

    const attrs = line.slice("#EXT-X-STREAM-INF:".length);
    const heightMatch = attrs.match(/RESOLUTION=\d+x(\d+)/i);
    const bandwidthMatch = attrs.match(/BANDWIDTH=(\d+)/i);
    const height = heightMatch ? Number(heightMatch[1]) : 0;
    const bitrate = bandwidthMatch ? Number(bandwidthMatch[1]) : 0;

    variants.push({
      index: variants.length,
      label: height ? `${height}p` : `Level ${variants.length + 1}`,
      height,
      bitrate,
    });
  }

  return variants.sort((a, b) => b.height - a.height || b.bitrate - a.bitrate);
}

export default function VideoPlayer({ options, onReady }) {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const qualityLevelsRef = useRef(null);
  const selectedRef = useRef("auto");
  const sourceKey = useMemo(() => getSourceKey(options?.sources), [options?.sources]);
  const hlsPlayback = isHlsSource(options?.sources);
  const playerOptions = useMemo(
    () => withHlsDefaults(options, hlsPlayback),
    [hlsPlayback, options]
  );

  const [qualities, setQualities] = useState([]);
  const [selected, setSelected] = useState("auto");
  const [qualitiesLoading, setQualitiesLoading] = useState(hlsPlayback);

  const applyQuality = useCallback((value) => {
    const qualityLevels = qualityLevelsRef.current;
    if (!qualityLevels) return;

    for (let i = 0; i < qualityLevels.length; i += 1) {
      qualityLevels[i].enabled = value === "auto" || String(i) === value;
    }

    selectedRef.current = value;
    setSelected(value);
  }, []);

  const syncQualityOptions = useCallback(() => {
    const qualityLevels = qualityLevelsRef.current;
    if (!qualityLevels?.length) return false;

    const entries = [];
    for (let i = 0; i < qualityLevels.length; i += 1) {
      const level = qualityLevels[i];
      entries.push({
        index: i,
        height: level.height || 0,
        bitrate: level.bitrate || 0,
      });
    }

    entries.sort((a, b) => b.height - a.height || b.bitrate - a.bitrate);

    setQualities(
      entries.map((entry) => ({
        index: entry.index,
        label: qualityLabel(qualityLevels[entry.index], entry.index),
      }))
    );
    setQualitiesLoading(false);

    const current = selectedRef.current;
    const next =
      current === "auto" || entries.some((entry) => String(entry.index) === current)
        ? current
        : "auto";

    for (let i = 0; i < qualityLevels.length; i += 1) {
      qualityLevels[i].enabled = next === "auto" || String(i) === next;
    }
    selectedRef.current = next;
    setSelected(next);
    return true;
  }, []);

  const loadQualitiesFromPlaylist = useCallback(async (src) => {
    if (!src) return false;

    try {
      const response = await fetch(src, { cache: "no-store" });
      if (!response.ok) return false;

      const variants = parseMasterPlaylistVariants(await response.text());
      if (!variants.length) return false;

      setQualities(
        variants.map((variant) => ({
          index: variant.index,
          label: variant.label,
        }))
      );
      setQualitiesLoading(false);
      return true;
    } catch {
      return false;
    }
  }, []);

  const resetQualityState = useCallback(() => {
    selectedRef.current = "auto";
    setSelected("auto");
    setQualities([]);
    setQualitiesLoading(hlsPlayback);
  }, [hlsPlayback]);

  const setupQualityLevels = useCallback(
    (player) => {
      if (typeof player.qualityLevels !== "function") return;

      const qualityLevels = player.qualityLevels();
      qualityLevelsRef.current = qualityLevels;

      qualityLevels.off("addqualitylevel", syncQualityOptions);
      qualityLevels.off("change", syncQualityOptions);
      qualityLevels.on("addqualitylevel", syncQualityOptions);
      qualityLevels.on("change", syncQualityOptions);

      syncQualityOptions();
    },
    [syncQualityOptions]
  );

  const refreshQualities = useCallback(
    async (player) => {
      setupQualityLevels(player);
      if (syncQualityOptions()) return;

      const src = playerOptions.sources?.[0]?.src ?? "";
      await loadQualitiesFromPlaylist(src);
    },
    [loadQualitiesFromPlaylist, playerOptions.sources, setupQualityLevels, syncQualityOptions]
  );

  useEffect(() => {
    if (!videoRef.current || playerRef.current) return;

    const videoElement = document.createElement("video-js");
    videoElement.classList.add("vjs-big-play-centered");
    videoRef.current.appendChild(videoElement);

    const player = (playerRef.current = videojs(videoElement, playerOptions, () => {
      onReady?.(player);
    }));

    player.ready(() => {
      setupQualityLevels(player);

      const onPlaylistReady = () => {
        void refreshQualities(player);
      };
      player.on("loadedplaylist", onPlaylistReady);
      player.on("loadedmetadata", onPlaylistReady);
      player.on("canplay", onPlaylistReady);
      player.on("playing", () => setQualitiesLoading(false));
    });

    return () => {
      if (playerRef.current && !playerRef.current.isDisposed()) {
        playerRef.current.dispose();
        playerRef.current = null;
        qualityLevelsRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.replaceChildren();
      }
    };
    // Player is created once per mount; source updates are handled separately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const player = playerRef.current;
    if (!player || player.isDisposed() || !sourceKey) return;

    const nextSrc = playerOptions.sources?.[0]?.src ?? "";
    if (player.currentSrc() === nextSrc) return;

    resetQualityState();
    player.src(playerOptions.sources);

    const onSourceReady = () => {
      void refreshQualities(player);
    };
    player.one("loadedplaylist", onSourceReady);
    player.one("loadedmetadata", onSourceReady);

    if (playerOptions.autoplay) {
      player.play()?.catch(() => {});
    }
  }, [
    playerOptions,
    refreshQualities,
    resetQualityState,
    sourceKey,
  ]);

  return (
    <div data-vjs-player className="w-full">
      <div ref={videoRef} />
      {hlsPlayback && (
        <div className="mt-3 flex items-center gap-2">
          <label htmlFor="quality-select" className="text-sm font-medium text-gray-700">
            Quality
          </label>
          <select
            id="quality-select"
            value={selected}
            onChange={(e) => applyQuality(e.target.value)}
            disabled={qualities.length === 0}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="auto">Auto</option>
            {qualities.map((quality) => (
              <option key={quality.index} value={String(quality.index)}>
                {quality.label}
              </option>
            ))}
          </select>
          {qualitiesLoading && qualities.length === 0 && (
            <span className="text-xs text-gray-500">Loading qualities…</span>
          )}
        </div>
      )}
    </div>
  );
}
