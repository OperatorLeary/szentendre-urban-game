import { describe, expect, it, vi } from "vitest";

import {
  type QrScannerReaderControls,
  type QrScannerStartAttempt,
  startQrScannerWithFallback
} from "@/presentation/components/quest/qr-scanner-start.util";

const FALLBACK_ATTEMPTS: readonly QrScannerStartAttempt[] = [
  {
    name: "ideal_environment",
    constraints: {
      video: {
        facingMode: {
          ideal: "environment"
        }
      }
    }
  },
  {
    name: "environment",
    constraints: {
      video: {
        facingMode: "environment"
      }
    }
  }
];

function createVideoElementMock(): HTMLVideoElement {
  return {} as HTMLVideoElement;
}

describe("startQrScannerWithFallback", () => {
  it("falls back to next constraints when the first attempt fails", async () => {
    const controls: QrScannerReaderControls = {
      stop: vi.fn()
    };
    const reader = {
      decodeFromConstraints: vi
        .fn()
        .mockRejectedValueOnce(new Error("ideal failed"))
        .mockResolvedValueOnce(controls)
    };
    const onDecode = vi.fn();

    const result = await startQrScannerWithFallback({
      reader,
      videoElement: createVideoElementMock(),
      onDecode,
      attempts: FALLBACK_ATTEMPTS
    });

    expect(result.attempt.name).toBe("environment");
    expect(result.controls).toBe(controls);
    expect(reader.decodeFromConstraints).toHaveBeenCalledTimes(2);
    expect(reader.decodeFromConstraints).toHaveBeenNthCalledWith(
      1,
      FALLBACK_ATTEMPTS[0]?.constraints,
      expect.any(Object),
      onDecode
    );
    expect(reader.decodeFromConstraints).toHaveBeenNthCalledWith(
      2,
      FALLBACK_ATTEMPTS[1]?.constraints,
      expect.any(Object),
      onDecode
    );
  });

  it("throws the last error when all attempts fail", async () => {
    const firstError = new Error("first failure");
    const secondError = new Error("second failure");
    const onAttemptFailure = vi.fn();
    const reader = {
      decodeFromConstraints: vi
        .fn()
        .mockRejectedValueOnce(firstError)
        .mockRejectedValueOnce(secondError)
    };

    await expect(
      startQrScannerWithFallback({
        reader,
        videoElement: createVideoElementMock(),
        onDecode: vi.fn(),
        attempts: FALLBACK_ATTEMPTS,
        onAttemptFailure
      })
    ).rejects.toBe(secondError);

    expect(onAttemptFailure).toHaveBeenCalledTimes(2);
    expect(onAttemptFailure).toHaveBeenNthCalledWith(1, {
      attempt: FALLBACK_ATTEMPTS[0],
      error: firstError
    });
    expect(onAttemptFailure).toHaveBeenNthCalledWith(2, {
      attempt: FALLBACK_ATTEMPTS[1],
      error: secondError
    });
  });

  it("throws a clear error when no start attempts are provided", async () => {
    const reader = {
      decodeFromConstraints: vi.fn()
    };

    await expect(
      startQrScannerWithFallback({
        reader,
        videoElement: createVideoElementMock(),
        onDecode: vi.fn(),
        attempts: []
      })
    ).rejects.toThrow("No QR scanner start attempts are configured.");
    expect(reader.decodeFromConstraints).not.toHaveBeenCalled();
  });
});
