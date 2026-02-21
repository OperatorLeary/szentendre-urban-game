interface TrackLike {
  stop: () => void;
}

interface TrackContainerLike {
  getTracks: () => readonly TrackLike[];
}

function hasTrackContainer(value: unknown): value is TrackContainerLike {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { getTracks?: unknown }).getTracks === "function"
  );
}

export function cleanupQrScannerVideo(videoElement: HTMLVideoElement | null): void {
  if (videoElement === null) {
    return;
  }

  try {
    videoElement.pause();
  } catch {
    // No-op; best-effort cleanup.
  }

  const streamCandidate: unknown = videoElement.srcObject;
  if (hasTrackContainer(streamCandidate)) {
    for (const track of streamCandidate.getTracks()) {
      try {
        track.stop();
      } catch {
        // No-op; best-effort cleanup.
      }
    }
  }

  videoElement.srcObject = null;

  try {
    videoElement.removeAttribute("src");
  } catch {
    // No-op; best-effort cleanup.
  }

  try {
    videoElement.load();
  } catch {
    // No-op; best-effort cleanup.
  }
}
