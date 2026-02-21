import { describe, expect, it, vi } from "vitest";

import { cleanupQrScannerVideo } from "@/presentation/components/quest/qr-scanner-media.util";

function createVideoMock(input?: { readonly stream?: unknown }): {
  readonly video: HTMLVideoElement;
  readonly pauseSpy: ReturnType<typeof vi.fn>;
  readonly removeAttributeSpy: ReturnType<typeof vi.fn>;
  readonly loadSpy: ReturnType<typeof vi.fn>;
} {
  const pauseSpy = vi.fn();
  const removeAttributeSpy = vi.fn();
  const loadSpy = vi.fn();
  const videoMock = {
    srcObject: input?.stream ?? null,
    pause: pauseSpy,
    removeAttribute: removeAttributeSpy,
    load: loadSpy
  };

  return {
    video: videoMock as unknown as HTMLVideoElement,
    pauseSpy,
    removeAttributeSpy,
    loadSpy
  };
}

describe("cleanupQrScannerVideo", () => {
  it("stops tracks and clears video state", () => {
    const trackStopA = vi.fn();
    const trackStopB = vi.fn();
    const stream = {
      getTracks: (): ReadonlyArray<{ stop: () => void }> => [
        { stop: trackStopA },
        { stop: trackStopB }
      ]
    };
    const { video, pauseSpy, removeAttributeSpy, loadSpy } = createVideoMock({
      stream
    });

    cleanupQrScannerVideo(video);

    expect(pauseSpy).toHaveBeenCalledTimes(1);
    expect(trackStopA).toHaveBeenCalledTimes(1);
    expect(trackStopB).toHaveBeenCalledTimes(1);
    expect(removeAttributeSpy).toHaveBeenCalledWith("src");
    expect(loadSpy).toHaveBeenCalledTimes(1);
    expect(video.srcObject).toBeNull();
  });

  it("does not throw when video is null", () => {
    expect((): void => {
      cleanupQrScannerVideo(null);
    }).not.toThrow();
  });

  it("does best-effort cleanup when stream shape is unexpected", () => {
    const { video } = createVideoMock({
      stream: {
        unexpected: true
      }
    });

    expect((): void => {
      cleanupQrScannerVideo(video);
    }).not.toThrow();
    expect(video.srcObject).toBeNull();
  });
});
