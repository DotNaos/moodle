"use client";

import { AlertTriangle, FastForward, Maximize, Minimize, Pause, Play, Rewind, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { isHLSStreamUrl, nativeHLSMimeTypes } from "@/lib/webex-recording-playback";
import { cn } from "@/lib/utils";

type PlaybackState = "ready" | "unsupported" | "failed";
type SeekOverlay = { direction: "forward" | "rewind"; id: number } | null;

const playbackSpeeds = [0.75, 1, 1.25, 1.5, 2];

export function WebexRecordingPlayer({
  poster,
  src,
}: {
  poster?: string;
  src: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<PlaybackState>("ready");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [seekOverlay, setSeekOverlay] = useState<SeekOverlay>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const usesHLS = isHLSStreamUrl(src);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !usesHLS) {
      setState("ready");
      return;
    }

    let disposed = false;
    let hls: { destroy: () => void } | null = null;

    setState("ready");
    video.removeAttribute("src");
    video.load();

    if (canPlayNativeHLS(video)) {
      video.src = src;
      video.load();
      return () => {
        video.removeAttribute("src");
        video.load();
      };
    }

    void import("hls.js")
      .then(({ default: Hls }) => {
        if (disposed) {
          return;
        }
        if (!Hls.isSupported()) {
          setState("unsupported");
          return;
        }

        const instance = new Hls({ enableWorker: true });
        hls = instance;
        instance.loadSource(src);
        instance.attachMedia(video);
        instance.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            setState("failed");
          }
        });
      })
      .catch(() => {
        if (!disposed) {
          setState("failed");
        }
      });

    return () => {
      disposed = true;
      hls?.destroy();
      video.removeAttribute("src");
      video.load();
    };
  }, [src, usesHLS]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setSpeed(1);
    video.playbackRate = 1;
  }, [src]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (!isPlaying || isDragging) {
      setShowControls(true);
      return;
    }

    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 2600);

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isDragging, isPlaying, showControls]);

  const revealControls = useCallback(() => {
    setShowControls(true);
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video || state !== "ready") {
      return;
    }

    if (video.paused) {
      void video.play().catch(() => setState("failed"));
      return;
    }

    video.pause();
  }, [state]);

  const skip = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const nextTime = Math.max(0, Math.min(video.currentTime + seconds, duration || video.duration || video.currentTime + seconds));
    video.currentTime = nextTime;
    setCurrentTime(nextTime);
    setSeekOverlay({ direction: seconds > 0 ? "forward" : "rewind", id: Date.now() });
    setTimeout(() => setSeekOverlay(null), 520);
  }, [duration]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
  }, []);

  const changeSpeed = useCallback((value: number) => {
    const video = videoRef.current;
    setSpeed(value);
    if (video) {
      video.playbackRate = value;
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }

    void container.requestFullscreen();
  }, []);

  const readPointerTime = useCallback((clientX: number) => {
    if (!progressRef.current || !duration) {
      return 0;
    }
    const rect = progressRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    return (x / rect.width) * duration;
  }, [duration]);

  const handleProgressPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!duration) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    setCurrentTime(readPointerTime(event.clientX));
  };

  const handleProgressPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    setCurrentTime(readPointerTime(event.clientX));
  };

  const handleProgressPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const nextTime = readPointerTime(event.clientX);
    setCurrentTime(nextTime);
    if (videoRef.current) {
      videoRef.current.currentTime = nextTime;
    }
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    setDuration(Number.isFinite(video.duration) ? video.duration : 0);
    setIsMuted(video.muted);
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || isDragging) {
      return;
    }
    setCurrentTime(video.currentTime);
    if (Number.isFinite(video.duration)) {
      setDuration(video.duration);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      togglePlay();
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      skip(-10);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      skip(10);
    }
  };

  const progressPercent = duration > 0 ? Math.max(0, Math.min(100, (currentTime / duration) * 100)) : 0;

  return (
    <div
      ref={containerRef}
      className={cn(
        "group/player relative aspect-video w-full overflow-hidden bg-black text-white",
        isFullscreen && "h-full",
      )}
      onKeyDown={handleKeyDown}
      onPointerMove={revealControls}
      tabIndex={0}
    >
      <video
        ref={videoRef}
        key={src}
        className="absolute inset-0 h-full w-full object-contain"
        controlsList="nodownload"
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        onLoadedMetadata={handleLoadedMetadata}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onTimeUpdate={handleTimeUpdate}
        poster={poster}
        preload="metadata"
        src={usesHLS ? undefined : src}
      />
      {seekOverlay ? (
        <div
          key={seekOverlay.id}
          className={cn(
            "pointer-events-none absolute inset-y-0 z-20 flex w-1/2 items-center justify-center",
            seekOverlay.direction === "forward" ? "right-0" : "left-0",
          )}
        >
          <span className="inline-flex flex-col items-center gap-1 rounded-full bg-black/55 p-5 text-white shadow-2xl backdrop-blur-md">
            {seekOverlay.direction === "forward" ? <FastForward className="size-8 fill-current" aria-hidden /> : <Rewind className="size-8 fill-current" aria-hidden />}
            <span className="text-sm font-semibold tabular-nums">{seekOverlay.direction === "forward" ? "+10s" : "-10s"}</span>
          </span>
        </div>
      ) : null}
      {state === "ready" && !isPlaying ? (
        <button
          className="absolute left-1/2 top-1/2 z-20 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/92 text-black shadow-2xl transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 md:size-20"
          type="button"
          aria-label="Play recording"
          onClick={(event) => {
            event.stopPropagation();
            togglePlay();
          }}
        >
          <Play className="ml-1 size-7 fill-current md:size-9" aria-hidden />
        </button>
      ) : null}
      {state !== "ready" ? (
        <div className="absolute inset-0 grid place-items-center bg-black px-6 text-center text-background">
          <div className="max-w-sm">
            <AlertTriangle className="mx-auto mb-3 text-background/70" aria-hidden />
            <p className="font-medium">
              {state === "unsupported" ? "This browser cannot play this recording." : "This recording could not be started."}
            </p>
            <p className="mt-1 text-sm text-background/70">
              Refresh the recordings list, then try the episode again.
            </p>
          </div>
        </div>
      ) : null}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-30 flex flex-col gap-2 bg-gradient-to-t from-black/90 via-black/55 to-transparent px-3 pb-3 pt-16 transition-opacity duration-300 md:gap-3 md:px-5 md:pb-5",
          showControls || !isPlaying ? "opacity-100" : "opacity-0",
        )}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div
          ref={progressRef}
          className="group/progress relative flex h-6 cursor-pointer touch-none items-center"
          onPointerDown={handleProgressPointerDown}
          onPointerLeave={handleProgressPointerUp}
          onPointerMove={handleProgressPointerMove}
          onPointerUp={handleProgressPointerUp}
          role="slider"
          aria-label="Seek recording"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(currentTime)}
        >
          <span className="absolute inset-x-0 h-1 rounded-full bg-white/25" />
          <span className="absolute left-0 h-1 rounded-full bg-white transition-[width] duration-100" style={{ width: `${progressPercent}%` }} />
          <span
            className={cn(
              "absolute size-3 -translate-x-1/2 rounded-full bg-white shadow-lg transition-transform duration-150",
              isDragging ? "scale-125" : "scale-0 group-hover/progress:scale-100 group-focus-within/progress:scale-100",
            )}
            style={{ left: `${progressPercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 md:gap-2">
            <PlayerIconButton label={isPlaying ? "Pause recording" : "Play recording"} onClick={togglePlay}>
              {isPlaying ? <Pause className="size-5 fill-current md:size-6" aria-hidden /> : <Play className="ml-0.5 size-5 fill-current md:size-6" aria-hidden />}
            </PlayerIconButton>
            <PlayerIconButton label="Back 10 seconds" onClick={() => skip(-10)}>
              <Rewind className="size-4 fill-current md:size-5" aria-hidden />
            </PlayerIconButton>
            <PlayerIconButton label="Forward 10 seconds" onClick={() => skip(10)}>
              <FastForward className="size-4 fill-current md:size-5" aria-hidden />
            </PlayerIconButton>
            <PlayerIconButton label={isMuted ? "Unmute recording" : "Mute recording"} onClick={toggleMute}>
              {isMuted ? <VolumeX className="size-4 md:size-5" aria-hidden /> : <Volume2 className="size-4 md:size-5" aria-hidden />}
            </PlayerIconButton>
            <span className="hidden text-xs font-medium tabular-nums text-white/78 sm:inline">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2">
            <select
              aria-label="Playback speed"
              className="h-9 rounded-full border-0 bg-white/14 px-3 text-sm font-semibold text-white outline-none transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/80"
              value={speed}
              onChange={(event) => changeSpeed(Number(event.target.value))}
            >
              {playbackSpeeds.map((playbackSpeed) => (
                <option key={playbackSpeed} className="bg-black text-white" value={playbackSpeed}>
                  {playbackSpeed}x
                </option>
              ))}
            </select>
            <PlayerIconButton label={isFullscreen ? "Exit fullscreen" : "Fullscreen"} onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize className="size-4 md:size-5" aria-hidden /> : <Maximize className="size-4 md:size-5" aria-hidden />}
            </PlayerIconButton>
          </div>
        </div>
        <span className="text-xs font-medium tabular-nums text-white/78 sm:hidden">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}

function canPlayNativeHLS(video: HTMLVideoElement): boolean {
  return nativeHLSMimeTypes().some((mimeType) => video.canPlayType(mimeType) !== "");
}

function PlayerIconButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="grid size-9 place-items-center rounded-full bg-white/12 text-white transition hover:bg-white/22 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 md:size-10"
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0:00";
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  }

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}
