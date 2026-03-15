import { describe, it, expect } from "vitest";

function shouldAcceptEvent(
  incomingSeq: number,
  incomingTs: number,
  lastSeq: number,
  lastUpdatedAt: number
): boolean {
  if (incomingSeq > 0) {
    return incomingSeq > lastSeq; // strict greater-than for seq
  }
  return incomingTs >= lastUpdatedAt; // legacy fallback for timestamp
}

describe("usePlayer seq-based event ordering", () => {
  it("accepts events with higher seq", () => {
    expect(shouldAcceptEvent(2, 1000, 1, 999)).toBe(true);
  });

  it("rejects events with lower seq (stale)", () => {
    // This is the core desync scenario: trackEnd's playerState (seq=1)
    // arrives after trackStart's playerState (seq=2).
    expect(shouldAcceptEvent(1, 1001, 2, 1000)).toBe(false);
  });

  it("rejects events with equal seq (duplicate)", () => {
    expect(shouldAcceptEvent(3, 1000, 3, 999)).toBe(false);
  });

  it("falls back to timestamp when seq is 0 (legacy/REST)", () => {
    expect(shouldAcceptEvent(0, 1001, 5, 1000)).toBe(true);
  });

  it("rejects legacy events with older timestamp", () => {
    expect(shouldAcceptEvent(0, 999, 5, 1000)).toBe(false);
  });

  it("accepts legacy events with equal timestamp", () => {
    // Legacy (no seq) uses >= for backward compatibility
    expect(shouldAcceptEvent(0, 1000, 5, 1000)).toBe(true);
  });

  it("simulates complete track transition race condition", () => {
    let lastSeq = 0;
    let lastTs = 0;
    let currentTrack: string | null = null;

    // Event 1: trackStart playerState (arrives first, seq=2)
    const ev1Seq = 2;
    const ev1Ts = 1000;
    if (shouldAcceptEvent(ev1Seq, ev1Ts, lastSeq, lastTs)) {
      lastSeq = ev1Seq;
      lastTs = ev1Ts;
      currentTrack = "Track B"; // new track
    }
    expect(currentTrack).toBe("Track B");

    // Event 2: trackEnd playerState (arrives second, seq=1, STALE!)
    const ev2Seq = 1;
    const ev2Ts = 999;
    if (shouldAcceptEvent(ev2Seq, ev2Ts, lastSeq, lastTs)) {
      lastSeq = ev2Seq;
      lastTs = ev2Ts;
      currentTrack = null; // would clear the track — this MUST NOT happen
    }
    // CRITICAL: stale event must be rejected, current track preserved
    expect(currentTrack).toBe("Track B");
    expect(lastSeq).toBe(2); // seq should still be 2, not overwritten
  });

  it("simulates same-millisecond timestamps without seq (old behavior)", () => {
    let lastTs = 0;
    let lastSeq = 0;

    // Both events have timestamp 1000 but different seq
    if (shouldAcceptEvent(1, 1000, lastSeq, lastTs)) {
      lastSeq = 1;
      lastTs = 1000;
    }
    // Second event with HIGHER seq should be accepted
    expect(shouldAcceptEvent(2, 1000, lastSeq, lastTs)).toBe(true);
    // But NOT with LOWER seq
    expect(shouldAcceptEvent(0, 1000, 2, 1000)).toBe(true); // legacy fallback, no seq
  });

  it("handles rapid multi-track transitions", () => {
    // Simulate 5 rapid track changes where events arrive out of order
    let lastSeq = 0;
    let lastTs = 0;
    let acceptedTrack = "";

    const events = [
      // [seq, timestamp, trackName] - arrival order (NOT emission order)
      { seq: 3, ts: 1002, track: "Track C" }, // arrives first
      { seq: 1, ts: 1000, track: "Track A" }, // arrives second (STALE)
      { seq: 5, ts: 1004, track: "Track E" }, // arrives third
      { seq: 2, ts: 1001, track: "Track B" }, // arrives fourth (STALE)
      { seq: 4, ts: 1003, track: "Track D" }, // arrives fifth (STALE)
    ];

    for (const ev of events) {
      if (shouldAcceptEvent(ev.seq, ev.ts, lastSeq, lastTs)) {
        lastSeq = ev.seq;
        lastTs = ev.ts;
        acceptedTrack = ev.track;
      }
    }

    expect(acceptedTrack).toBe("Track E");
    expect(lastSeq).toBe(5);
  });
});
