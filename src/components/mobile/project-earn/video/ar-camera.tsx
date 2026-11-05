"use client";

// 11c · AR — record the real product on this phone, and what follows:
// · 11s: opened directly while the phone hasn't been asked yet, the app asks
//   first (Use your camera?); from Generate video it has already asked.
// · 11u ready to record → 11c recording: the live camera full screen, the one
//   exit (✕), the guide card, the REC timer, the progress and "0:04 of 0:10",
//   the shutter; it stops itself at 10 seconds (MediaRecorder, video only).
// · 11t camera off: why, in words (turned off, no camera, can't record in
//   this browser), Try again (the browser can't open the phone's Settings, so
//   after turning it on there the maker asks again here) and Upload a video.
// · 11d Your clip: the clip, "10-second clip · Recorded on this phone · …",
//   Use this clip (11v while it is kept; 11w when it couldn't be; 11x waits for
//   a connection), Record again, Decide later (kept as a take to review from
//   the row). A kept clip is a take of the product in the web's own record, so
//   the Media tab and the Sell / Give readiness count it once it is in use.
// Flash and flip wait on decision D-8.

import * as React from "react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/dashboard/icon";
import { Banner } from "@/components/ideeza/banner";
import { Button } from "@/components/ideeza/button";
import { IconButton } from "@/components/ideeza/icon-button";
import { ProgressBar } from "@/components/ideeza/progress-bar";
import { Spinner } from "@/components/ideeza/spinner";
import type { VideoTarget } from "@/components/video-jobs/generate-video-dialog";
import { formatDate } from "@/lib/manual/project-summary";
import {
  CAMERA_TROUBLE_COPY,
  RECORD_MS,
  cameraTroubleOf,
  clipMetaOf,
  pickRecorderMime,
  recordClock,
  type CameraTrouble,
  type ClipOrigin,
} from "@/lib/video/phone-video";
import { clockOf, renderTitle } from "@/lib/video/video-copy";
import { cn } from "@/lib/utils";
import { BottomBar } from "../../kit/bottom-bar";
import { useOnline } from "../../kit/states";
import { useToast } from "../../kit/toast";
import { HomeIndicator } from "../../home-indicator";
import { Screen } from "../../screen";
import { StatusBar } from "../../status-bar";
import { TopBar } from "../../top-bar";
import { CameraAskSheet, cameraPermission } from "./camera-ask";
import { ChoiceList, clipKeptLine } from "./review";
import { VideoLoading, VideoUnavailable, keepClip, useLeave, useVideoScope, type ClipToKeep } from "./target";

const TITLE = "Your clip";

export function ArCameraScreen({ projectId, productId, fromVideo, asked }: { projectId: string; productId: string; fromVideo: boolean; asked: boolean }) {
  const scope = useVideoScope(projectId, productId);
  if (scope.state === "loading") return <VideoLoading title={TITLE} />;
  if (scope.state === "missing") return <VideoUnavailable title={TITLE} projectId={projectId} />;
  if (scope.refused) return <VideoUnavailable title={TITLE} projectId={projectId} reason={scope.refused} />;
  return <ArCamera target={scope.target} fromVideo={fromVideo} asked={asked} />;
}

type Clip = ClipToKeep & { url: string; madeAt: number };

type Phase =
  | { kind: "ask" }
  | { kind: "opening" }
  | { kind: "off"; trouble: CameraTrouble }
  | { kind: "ready" }
  | { kind: "recording" }
  | { kind: "clip"; clip: Clip; sending: "idle" | "busy" | "failed" };

/** The frame the preview shows now, as a JPEG (the clip's poster). */
function grabFrame(video: HTMLVideoElement | null): Promise<Blob | null> {
  if (!video || !video.videoWidth) return Promise.resolve(null);
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85));
}

/** An uploaded file's length, size and poster, read by the browser's own player; null when it can't play it. */
function readUpload(file: File): Promise<Omit<Clip, "how" | "madeAt"> | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    const fail = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    video.onerror = fail;
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(1.5, Number.isFinite(video.duration) ? video.duration / 2 : 0);
    };
    video.onseeked = () => {
      void grabFrame(video).then((poster) => {
        if (!poster) return fail();
        resolve({
          url,
          video: file,
          poster,
          mime: file.type || "video/mp4",
          width: video.videoWidth,
          height: video.videoHeight,
          durationMs: Number.isFinite(video.duration) ? Math.round(video.duration * 1000) : RECORD_MS,
          bytes: file.size,
        });
      });
    };
    video.src = url;
  });
}

function ArCamera({ target, fromVideo, asked }: { target: VideoTarget; fromVideo: boolean; asked: boolean }) {
  const toast = useToast();
  const online = useOnline();
  const leave = useLeave(target.projectId);
  const [phase, setPhase] = React.useState<Phase>({ kind: "opening" });
  const [elapsed, setElapsed] = React.useState(0);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const preview = React.useRef<HTMLVideoElement>(null);
  const stream = React.useRef<MediaStream | null>(null);
  const recorder = React.useRef<MediaRecorder | null>(null);
  const chunks = React.useRef<Blob[]>([]);
  const started = React.useRef(0);
  const poster = React.useRef<Blob | null>(null);
  const upload = React.useRef<HTMLInputElement>(null);
  const alive = React.useRef(true);

  const stopStream = React.useCallback(() => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  }, []);

  const open = React.useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setPhase({ kind: "off", trouble: "unsupported" });
      return;
    }
    setPhase({ kind: "opening" });
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      if (!alive.current) {
        s.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = s;
      setElapsed(0);
      setPhase({ kind: "ready" });
    } catch (e) {
      if (alive.current) setPhase({ kind: "off", trouble: cameraTroubleOf(e instanceof Error ? e.name : null) });
    }
  }, []);

  // First the app's own ask (11s) while the phone hasn't been asked; then the camera.
  React.useEffect(() => {
    alive.current = true;
    let cancelled = false;
    void (async () => {
      const state = asked ? "granted" : await cameraPermission();
      if (cancelled) return;
      if (state === "prompt" || state === "unknown") setPhase({ kind: "ask" });
      else void open();
    })();
    return () => {
      cancelled = true;
      alive.current = false;
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, [asked, open]);

  // The live preview follows the stream.
  const live = phase.kind === "ready" || phase.kind === "recording";
  React.useEffect(() => {
    const v = preview.current;
    if (live && v && stream.current && v.srcObject !== stream.current) {
      v.srcObject = stream.current;
      void v.play().catch(() => undefined);
    }
  }, [live]);

  // A clip's object URL goes with it.
  const clipUrl = phase.kind === "clip" ? phase.clip.url : null;
  React.useEffect(() => () => {
    if (clipUrl) URL.revokeObjectURL(clipUrl);
  }, [clipUrl]);

  const finish = React.useCallback(
    async (rec: MediaRecorder, mime: string) => {
      const durationMs = Math.min(RECORD_MS, Math.round(performance.now() - started.current));
      const video = new Blob(chunks.current, { type: rec.mimeType || mime || "video/webm" });
      const frame = poster.current ?? (await grabFrame(preview.current));
      const v = preview.current;
      const settings = stream.current?.getVideoTracks()[0]?.getSettings();
      const width = v?.videoWidth || settings?.width || 0;
      const height = v?.videoHeight || settings?.height || 0;
      stopStream();
      if (!alive.current) return;
      if (!frame || video.size === 0) {
        setPhase({ kind: "off", trouble: "unsupported" });
        return;
      }
      setPhase({
        kind: "clip",
        sending: "idle",
        clip: { url: URL.createObjectURL(video), video, poster: frame, mime: video.type, width, height, durationMs, bytes: video.size, how: "camera", madeAt: Date.now() },
      });
    },
    [stopStream],
  );

  const record = () => {
    const s = stream.current;
    if (!s) return;
    const mime = pickRecorderMime((m) => MediaRecorder.isTypeSupported(m));
    let rec: MediaRecorder;
    try {
      rec = mime ? new MediaRecorder(s, { mimeType: mime }) : new MediaRecorder(s);
    } catch {
      setPhase({ kind: "off", trouble: "unsupported" });
      return;
    }
    chunks.current = [];
    poster.current = null;
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.current.push(e.data);
    };
    rec.onstop = () => void finish(rec, mime);
    recorder.current = rec;
    rec.start(250);
    started.current = performance.now();
    setElapsed(0);
    setPhase({ kind: "recording" });
  };
  const stop = React.useCallback(() => {
    if (recorder.current?.state === "recording") recorder.current.stop();
  }, []);

  // The clock while recording: the poster at 1.5 s, and the stop at 10.
  React.useEffect(() => {
    if (phase.kind !== "recording") return;
    const id = window.setInterval(() => {
      const ms = performance.now() - started.current;
      setElapsed(ms);
      if (!poster.current && ms >= 1500) {
        void grabFrame(preview.current).then((b) => {
          if (b && !poster.current) poster.current = b;
        });
      }
      if (ms >= RECORD_MS) stop();
    }, 100);
    return () => window.clearInterval(id);
  }, [phase.kind, stop]);

  const onUpload = async (file: File | undefined) => {
    setUploadError(null);
    if (!file) return;
    if (!file.type.startsWith("video/")) return setUploadError("That file isn’t a video. Pick a video clip.");
    const read = await readUpload(file);
    if (!alive.current) return;
    if (!read) return setUploadError("This phone can’t play that video. Pick another clip.");
    stopStream();
    setPhase({ kind: "clip", sending: "idle", clip: { ...read, how: "upload" as ClipOrigin, madeAt: Date.now() } });
  };

  /** Out past Generate video, when that's where the camera was opened from. */
  const done = () => {
    if (fromVideo && window.history.length > 2) window.history.go(-2);
    else leave();
  };
  const keep = async (use: boolean) => {
    if (phase.kind !== "clip") return;
    const clip = phase.clip;
    setPhase({ ...phase, sending: "busy" });
    try {
      const { n } = await keepClip(target, clip, use);
      toast({ title: use ? `${target.productName} take ${n} is in use.` : `${target.productName} video is ready to review.` });
      done();
    } catch {
      if (alive.current) setPhase({ kind: "clip", clip, sending: "failed" });
    }
  };
  const recordAgain = () => {
    setUploadError(null);
    void open();
  };
  const close = () => {
    stop();
    stopStream();
    leave();
  };

  const uploadInput = (
    <input
      ref={upload}
      type="file"
      accept="video/*"
      className="sr-only"
      tabIndex={-1}
      aria-hidden
      onChange={(e) => {
        void onUpload(e.target.files?.[0]);
        e.target.value = "";
      }}
    />
  );

  // ── 11d · Your clip (11v sending, 11w failed, 11x offline) ──
  if (phase.kind === "clip") {
    const { clip, sending } = phase;
    const busy = sending === "busy";
    return (
      <Screen top={<TopBar back title={TITLE} />} className="px-8 pb-12">
        <p className="pb-8 text-sm leading-sm text-text-secondary">{renderTitle(`For ${target.productName}`, target.projectName)}</p>
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-md bg-bg-inverse">
              <video src={clip.url} controls playsInline preload="metadata" aria-label={`${target.productName} clip`} className="size-full object-contain" />
            </div>
            <p className="text-sm leading-sm text-text-secondary">{clipMetaOf(clip.durationMs, clip.how, formatDate(clip.madeAt))}</p>
            <p className="text-sm leading-sm text-text-secondary">{clipKeptLine(target.productName)}</p>
          </div>
          <div className="flex flex-col gap-6">
            <h2 className="text-lg font-semibold leading-lg text-text-primary">Is this the clip you want?</h2>
            {sending === "failed" && (
              <Banner tone="error" title="Your clip didn’t send">
                Check your connection and try again. The clip is still on this phone.
              </Banner>
            )}
            {!online && (
              <Banner tone="attention" title="You’re offline">
                Your clip stays on this phone. You can send it when you’re back online.
              </Banner>
            )}
            <Button size="xl" className="w-full" disabled={!online} loading={busy} onClick={() => void keep(true)}>
              {busy ? "Sending your clip…" : !online ? "Waiting for a connection" : sending === "failed" ? "Try again" : "Use this clip"}
            </Button>
            <ChoiceList
              label="Other choices"
              choices={[
                { title: "Record again", text: "A new 10-second clip", onClick: () => !busy && recordAgain() },
                { title: "Decide later", text: "Keep it to review from the row", onClick: () => !busy && void keep(false) },
              ]}
            />
          </div>
        </div>
      </Screen>
    );
  }

  // ── the camera: 11s ask, opening, 11t off, 11u ready, 11c recording ──
  const recording = phase.kind === "recording";
  const shown = recording ? elapsed : 0;
  return (
    <div data-theme="light" className="relative flex h-full flex-col overflow-hidden bg-bg-inverse font-sans">
      {live && (
        <video ref={preview} muted playsInline autoPlay aria-label="Camera preview" className="absolute inset-0 size-full object-cover" />
      )}
      <div className="relative flex flex-col">
        <StatusBar tone="media" />
        <div className="flex items-center gap-4 px-8 pt-2">
          <IconButton hierarchy="secondary" size="xl" aria-label="Close the camera" icon={<Icon icon={Cancel01Icon} size={22} />} onClick={close} />
          <span className="flex-1" />
          {recording && (
            <span className="rounded-full bg-bg-error px-4 py-1 text-sm leading-sm text-text-inverse tabular-nums">
              REC {clockOf(Math.min(elapsed, RECORD_MS))}
            </span>
          )}
        </div>
        {live && (
          <div className="mx-8 mt-4 flex flex-col gap-1 rounded-xl bg-[color-mix(in_srgb,var(--color-bg-inverse)_80%,transparent)] px-8 py-6 text-text-inverse">
            <p className="text-md font-medium leading-md">{recording ? "Record a 10-second clip" : "Ready when you are"}</p>
            <p className="text-sm leading-sm">
              {recording
                ? "Walk around the product. The app trims it and sends it here."
                : "Hold the phone steady, tap the button, then walk slowly around the product for 10 seconds."}
            </p>
          </div>
        )}
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-16 text-center text-text-inverse">
        {phase.kind === "opening" && (
          <p role="status" className="flex items-center gap-4 text-md leading-md">
            <Spinner size={20} />
            Opening the camera…
          </p>
        )}
        {phase.kind === "off" && (
          <>
            <p className="text-md font-medium leading-md">{CAMERA_TROUBLE_COPY[phase.trouble].title}</p>
            <p className="text-sm leading-sm">{CAMERA_TROUBLE_COPY[phase.trouble].text}</p>
          </>
        )}
        {uploadError && (
          <p role="alert" className="pt-4 text-sm leading-sm">
            {uploadError}
          </p>
        )}
      </div>

      {phase.kind === "off" ? (
        <div className="relative">
          <BottomBar className="gap-6 border-t-0 bg-transparent pt-8">
            {phase.trouble === "denied" && (
              <Button size="xl" className="w-full" onClick={recordAgain}>
                Try again
              </Button>
            )}
            <Button hierarchy="inverse" size="xl" className="w-full" onClick={() => upload.current?.click()}>
              Upload a video
            </Button>
          </BottomBar>
          <HomeIndicator tone="media" />
        </div>
      ) : (
        <div className="relative flex flex-col items-center gap-6 bg-[color-mix(in_srgb,var(--color-bg-inverse)_90%,transparent)] px-16 pt-8">
          <ProgressBar value={(shown / RECORD_MS) * 100} label="Recording" />
          <p className="text-sm leading-sm text-text-inverse tabular-nums">{recordClock(shown)}</p>
          <button
            type="button"
            aria-label={recording ? "Stop recording" : "Start recording"}
            disabled={phase.kind !== "ready" && !recording}
            onClick={recording ? stop : record}
            className="inline-flex size-[72px] items-center justify-center rounded-full border-[length:var(--border-width-2)] border-solid border-[color:var(--color-text-inverse)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-border-focus-inverse)] disabled:opacity-50"
          >
            <span aria-hidden className={cn("bg-[var(--color-icon-error)]", recording ? "size-[28px] rounded-md" : "size-[56px] rounded-full")} />
          </button>
          <HomeIndicator tone="media" />
        </div>
      )}
      {uploadInput}
      <CameraAskSheet
        open={phase.kind === "ask"}
        onAllow={() => void open()}
        onClose={() => {
          if (phase.kind === "ask") leave();
        }}
      />
    </div>
  );
}
