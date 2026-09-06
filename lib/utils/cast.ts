"use client";

import { useEffect, useRef, useState } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    __onGCastApiAvailable?: (isAvailable: boolean) => void;
    chrome?: any;
    cast?: any;
    WebKitPlaybackTargetAvailabilityEvent?: any;
  }
}

let castSdkLoading = false;
let castSdkLoaded = false;

export function loadGoogleCastSdk(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (castSdkLoaded || (window.cast && window.cast.framework)) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    window.__onGCastApiAvailable = (isAvailable: boolean) => {
      if (isAvailable && window.cast && window.cast.framework) {
        try {
          const context = window.cast.framework.CastContext.getInstance();
          context.setOptions({
            receiverApplicationId:
              window.chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
            autoJoinPolicy: window.chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
          });
          castSdkLoaded = true;
          resolve(true);
          return;
        } catch {
          /* ignore cast init errors */
        }
      }
      resolve(false);
    };

    if (!castSdkLoading) {
      castSdkLoading = true;
      const script = document.createElement("script");
      script.src =
        "https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1";
      script.async = true;
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    }
  });
}

export interface UseCastOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  streamUrl?: string;
  title?: string;
  posterUrl?: string;
  onToast?: (message: string, kind?: "info" | "success" | "error") => void;
}

export function useCast({
  videoRef,
  streamUrl,
  title = "MovieVault Stream",
  posterUrl,
  onToast,
}: UseCastOptions) {
  const [hasAirPlay, setHasAirPlay] = useState(false);
  const [hasCast, setHasCast] = useState(false);
  const [isCasting, setIsCasting] = useState(false);
  const [castDevice, setCastDevice] = useState<string | null>(null);
  const remotePlayerRef = useRef<any>(null);
  const remotePlayerControllerRef = useRef<any>(null);

  // 1. Detect WebKit AirPlay availability
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (
      typeof window !== "undefined" &&
      (window.WebKitPlaybackTargetAvailabilityEvent ||
        typeof (video as any).webkitShowPlaybackTargetPicker === "function")
    ) {
      setHasAirPlay(true);
      const onTargetAvailability = (e: any) => {
        if (e.availability === "available") {
          setHasAirPlay(true);
        }
      };
      video.addEventListener(
        "webkitplaybacktargetavailabilitychanged",
        onTargetAvailability as any,
      );
      return () => {
        video.removeEventListener(
          "webkitplaybacktargetavailabilitychanged",
          onTargetAvailability as any,
        );
      };
    }
  }, [videoRef]);

  // 2. Load and initialize Google Cast SDK
  useEffect(() => {
    void loadGoogleCastSdk().then((available) => {
      if (available && window.cast && window.cast.framework) {
        setHasCast(true);
        try {
          const remotePlayer = new window.cast.framework.RemotePlayer();
          const controller = new window.cast.framework.RemotePlayerController(remotePlayer);
          remotePlayerRef.current = remotePlayer;
          remotePlayerControllerRef.current = controller;

          controller.addEventListener(
            window.cast.framework.RemotePlayerEventType.IS_CONNECTED_CHANGED,
            () => {
              const connected = remotePlayer.isConnected;
              setIsCasting(connected);
              if (connected) {
                const context = window.cast.framework.CastContext.getInstance();
                const session = context.getCurrentSession();
                const devName = session?.getCastDevice()?.friendlyName || "Smart TV";
                setCastDevice(devName);
                onToast?.(`Connected to ${devName}`, "success");
              } else {
                setCastDevice(null);
                onToast?.("Disconnected from TV", "info");
              }
            },
          );
        } catch {
          /* ignore controller binding error */
        }
      }
    });
  }, [onToast]);

  // Trigger Cast / AirPlay
  const requestCast = async () => {
    const video = videoRef.current;

    // A. If already casting, offer to disconnect
    if (isCasting) {
      try {
        if (window.cast?.framework) {
          window.cast.framework.CastContext.getInstance().endCurrentSession(true);
          setIsCasting(false);
          setCastDevice(null);
          return;
        }
      } catch {
        /* ignore */
      }
    }

    // B. Apple AirPlay Trigger (Safari / iOS / Mac)
    if (video && typeof (video as any).webkitShowPlaybackTargetPicker === "function") {
      try {
        (video as any).webkitShowPlaybackTargetPicker();
        return;
      } catch {
        /* fallback to google cast */
      }
    }

    // C. Google Cast SDK Trigger
    if (window.cast?.framework && window.chrome?.cast) {
      try {
        const context = window.cast.framework.CastContext.getInstance();
        await context.requestSession();
        const session = context.getCurrentSession();
        if (session && streamUrl) {
          const mimeType = streamUrl.includes(".m3u8")
            ? "application/x-mpegURL"
            : "video/mp4";
          const mediaInfo = new window.chrome.cast.media.MediaInfo(streamUrl, mimeType);
          mediaInfo.metadata = new window.chrome.cast.media.GenericMediaMetadata();
          mediaInfo.metadata.title = title;
          if (posterUrl) {
            mediaInfo.metadata.images = [{ url: posterUrl }];
          }

          const request = new window.chrome.cast.media.LoadRequest(mediaInfo);
          if (video && !Number.isNaN(video.currentTime)) {
            request.currentTime = video.currentTime;
          }
          request.autoplay = video ? !video.paused : true;

          session.loadMedia(request).then(
            () => {
              const dev = session.getCastDevice()?.friendlyName || "Smart TV";
              setCastDevice(dev);
              setIsCasting(true);
              onToast?.(`Casting "${title}" to ${dev}`, "success");
            },
            () => {
              onToast?.("Unable to start cast playback on TV", "error");
            },
          );
        }
        return;
      } catch (err: any) {
        if (err !== "cancel") {
          onToast?.("Searching for Cast devices on your Wi-Fi...", "info");
        }
      }
    }

    // D. W3C Remote Playback API Fallback
    if (video && "remote" in HTMLMediaElement.prototype && (video as any).remote?.prompt) {
      try {
        await (video as any).remote.prompt();
        return;
      } catch {
        /* ignore */
      }
    }

    // E. Informative Toast if no device detected
    onToast?.(
      "No Chromecast or Smart TV detected on your Wi-Fi network. Ensure your TV is powered on and connected.",
      "info",
    );
  };

  return {
    hasAirPlay,
    hasCast: hasCast || hasAirPlay,
    isCasting,
    castDevice,
    requestCast,
  };
}
