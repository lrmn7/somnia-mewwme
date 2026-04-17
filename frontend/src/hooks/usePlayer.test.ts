import { describe, it, expect } from "vitest";

function shouldAcceptEvent(
  incomingSeq: number,
  incomingTs: number,
  lastSeq: number,
  lastUpdatedAt: number
): boolean {
  if (incomingSeq > 0) {
    return incomingSeq > lastSeq;
  }
  return incomingTs >= lastUpdatedAt; 
}

describe("usePlayer seq-based event ordering", () => {
  it("accepts events with higher seq", () => {
    expect(shouldAcceptEvent(2, 1000, 1, 999)).toBe(true);
  });

  it("rejects events with lower seq (stale)", () => {
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
    expect(shouldAcceptEvent(0, 1000, 5, 1000)).toBe(true);
  });

  it("simulates complete track transition race condition", () => {
    let lastSeq = 0;
    let lastTs = 0;
    let currentTrack: string | null = null;

    const ev1Seq = 2;
    const ev1Ts = 1000;
    if (shouldAcceptEvent(ev1Seq, ev1Ts, lastSeq, lastTs)) {
      lastSeq = ev1Seq;
      lastTs = ev1Ts;
      currentTrack = "Track B"; // new track
    }
    expect(currentTrack).toBe("Track B");

    const ev2Seq = 1;
    const ev2Ts = 999;
    if (shouldAcceptEvent(ev2Seq, ev2Ts, lastSeq, lastTs)) {
      lastSeq = ev2Seq;
      lastTs = ev2Ts;
      currentTrack = null;
    }
    expect(currentTrack).toBe("Track B");
    expect(lastSeq).toBe(2);
  });

  it("simulates same-millisecond timestamps without seq (old behavior)", () => {
    let lastTs = 0;
    let lastSeq = 0;

    if (shouldAcceptEvent(1, 1000, lastSeq, lastTs)) {
      lastSeq = 1;
      lastTs = 1000;
    }
    expect(shouldAcceptEvent(2, 1000, lastSeq, lastTs)).toBe(true);
    expect(shouldAcceptEvent(0, 1000, 2, 1000)).toBe(true); // legacy fallback, no seq
  });

  it("handles rapid multi-track transitions", () => {
    let lastSeq = 0;
    let lastTs = 0;
    let acceptedTrack = "";

    const events = [
      { seq: 3, ts: 1002, track: "Track C" }, 
      { seq: 1, ts: 1000, track: "Track A" }, 
      { seq: 5, ts: 1004, track: "Track E" }, 
      { seq: 2, ts: 1001, track: "Track B" }, 
      { seq: 4, ts: 1003, track: "Track D" }, 
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
