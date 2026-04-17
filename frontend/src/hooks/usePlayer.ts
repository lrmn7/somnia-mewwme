import { useEffect, useReducer, useCallback, useMemo, useRef } from "react";
import type { Socket } from "socket.io-client";
import type { PlayerState, Track, LoopMode } from "@/types/player";
import { api } from "@/lib/api";

type Action =
  | { type: "SET_STATE"; payload: PlayerState }
  | { type: "TRACK_START"; payload: Track }
  | { type: "PLAYER_UPDATE"; payload: { position: number } }
  | { type: "PLAYER_PAUSE" }
  | { type: "PLAYER_RESUME" }
  | { type: "PLAYER_END" }
  | { type: "PLAYER_DESTROY" }
  | { type: "PLAYER_STATE_UPDATE"; payload: Partial<PlayerState> }
  | { type: "MEMBER_UPDATE"; payload: boolean }
  | { type: "SKIP_OPTIMISTIC" }
  | { type: "QUEUE_UPDATE"; payload: { queue: Track[] } };

function reducer(
  state: PlayerState | null,
  action: Action
): PlayerState | null {
  switch (action.type) {
    case "SET_STATE": {
      let merged = action.payload;
      if (state) {
        const preserve: Partial<PlayerState> = {};
        if (
          merged.member === null &&
          state.member !== null &&
          state.member !== undefined
        ) {
          preserve.member = state.member;
        }
        if (state.isPremium !== undefined && merged.isPremium === undefined) {
          preserve.isPremium = state.isPremium;
          preserve.isOwner = state.isOwner;
          preserve.isAdmin = state.isAdmin;
          preserve.hasFilterAccess = state.hasFilterAccess;
          preserve.hasAutoplayAccess = state.hasAutoplayAccess;
          preserve.autoplayEnabled = state.autoplayEnabled;
          preserve.filterRequirement = state.filterRequirement;
          preserve.autoplayRequirement = state.autoplayRequirement;
          preserve.voteUrl = state.voteUrl;
          preserve.defaultSource = state.defaultSource;
          preserve.sourceAccess = state.sourceAccess;
        }
        if (Object.keys(preserve).length > 0) {
          merged = { ...merged, ...preserve };
        }
      }
      return merged;
    }
    case "TRACK_START":
      return state
        ? { ...state, current: action.payload, pause: false, position: 0, trackKey: (state.trackKey ?? 0) + 1 }
        : null;
    case "PLAYER_UPDATE":
      return state ? { ...state, position: action.payload.position } : null;
    case "PLAYER_PAUSE":
      return state ? { ...state, pause: true } : null;
    case "PLAYER_RESUME":
      return state ? { ...state, pause: false } : null;
    case "PLAYER_END":
      return state ? { ...state, current: null, position: 0, trackKey: (state.trackKey ?? 0) + 1 } : null;
    case "PLAYER_DESTROY":
      return null;
    case "MEMBER_UPDATE":
      return state ? { ...state, member: action.payload } : null;
    case "SKIP_OPTIMISTIC":
      return state ? { ...state, position: 0, pause: false } : null;
    case "PLAYER_STATE_UPDATE":
      if (!state) {
        const p = action.payload as Record<string, unknown>;
        if (Array.isArray(p["queue"])) return action.payload as PlayerState;
        return null;
      }
      return { ...state, ...action.payload };
    case "QUEUE_UPDATE":
      return state ? { ...state, queue: action.payload.queue } : null;
    default:
      return state;
  }
}

export function usePlayer(
  guildId: string,
  socket: Socket | null,
  userId?: string
) {
  const validGuild =
    !!guildId && guildId !== "null" && guildId !== "undefined";
  const [state, dispatch] = useReducer(reducer, null);
  const lastUpdatedAt = useRef<number>(0);
  const lastSeq = useRef<number>(0);
  const bcRef = useRef<BroadcastChannel | null>(null);
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    if (!validGuild) return;
    const bc = new BroadcastChannel(`mewwme-player:${guildId}`);
    bcRef.current = bc;

    bc.onmessage = (ev: MessageEvent) => {
      if (ev.data?.type === "playerState" && ev.data.state) {
        const incoming = ev.data.state as PlayerState;
        const incomingSeq = incoming.seq ?? 0;
        const ts = incoming.updatedAt ?? 0;
        const accept = incomingSeq > 0
          ? incomingSeq > lastSeq.current
          : ts >= lastUpdatedAt.current;
        if (accept) {
          lastUpdatedAt.current = ts;
          if (incomingSeq > 0) lastSeq.current = incomingSeq;
          dispatch({ type: "SET_STATE", payload: incoming });
        }
      } else if (ev.data?.type === "playerDestroy") {
        dispatch({ type: "PLAYER_DESTROY" });
      }
    };

    return () => {
      bc.close();
      bcRef.current = null;
    };
  }, [guildId, validGuild]);

  const broadcastState = useCallback((data: PlayerState) => {
    bcRef.current?.postMessage({ type: "playerState", state: data });
  }, []);

  const fetchState = useCallback(async () => {
    if (!validGuild) return;
    try {
      const { data } = await api.get<PlayerState>(
        `/api/player/${guildId}`
      );
      const incomingSeq = data.seq ?? 0;
      const ts = data.updatedAt ?? Date.now();
      if (incomingSeq > 0 ? incomingSeq >= lastSeq.current : ts >= lastUpdatedAt.current) {
        lastUpdatedAt.current = ts;
        if (incomingSeq > 0) lastSeq.current = incomingSeq;
        dispatch({ type: "SET_STATE", payload: data });
        broadcastState(data);
      }
    } catch {
    }
  }, [guildId, validGuild, broadcastState]);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  useEffect(() => {
    const onVisChange = () => {
      if (document.visibilityState === "visible") fetchState();
    };
    document.addEventListener("visibilitychange", onVisChange);
    return () => document.removeEventListener("visibilitychange", onVisChange);
  }, [fetchState]);

  useEffect(() => {
    if (!socket) return;

    const onConnect = () => fetchState();
    const onTrackStart = (msg: { data: Track }) =>
      dispatch({ type: "TRACK_START", payload: msg.data });
    const onCreate = (payload: unknown) => {
      const p = payload as Record<string, unknown>;
      if (Array.isArray(p["queue"])) {
        dispatch({
          type: "SET_STATE",
          payload: p as unknown as PlayerState,
        });
      } else {
        fetchState();
      }
    };
    const onUpdate = (msg: { position: number }) =>
      dispatch({ type: "PLAYER_UPDATE", payload: { position: msg.position } });
    const onPause = () => dispatch({ type: "PLAYER_PAUSE" });
    const onResume = () => dispatch({ type: "PLAYER_RESUME" });
    const onEnd = () => dispatch({ type: "PLAYER_END" });
    const onDestroy = () => {
      dispatch({ type: "PLAYER_DESTROY" });
      bcRef.current?.postMessage({ type: "playerDestroy" });
    };
    const onStateUpdate = (
      msg: Partial<PlayerState> & { _guild?: string }
    ) => {
      const { _guild, ...patch } = msg;
      void _guild;
      const incomingSeq = (patch as PlayerState).seq ?? 0;
      const ts = (patch as PlayerState).updatedAt ?? Date.now();
      const accept = incomingSeq > 0
        ? incomingSeq > lastSeq.current
        : ts >= lastUpdatedAt.current;
      if (accept) {
        lastUpdatedAt.current = ts;
        if (incomingSeq > 0) lastSeq.current = incomingSeq;
        dispatch({ type: "PLAYER_STATE_UPDATE", payload: patch });
        broadcastState(patch as PlayerState);
      }
    };
    const onMemberJoin = (msg: { userId?: string }) => {
      if (userId && msg.userId === userId) {
        dispatch({ type: "MEMBER_UPDATE", payload: true });
      }
    };
    const onMemberLeave = (msg: { userId?: string }) => {
      if (userId && msg.userId === userId) {
        dispatch({ type: "MEMBER_UPDATE", payload: false });
      }
    };
    const onQueueUpdate = (msg: { queue?: Track[] }) => {
      if (msg.queue) {
        dispatch({ type: "QUEUE_UPDATE", payload: { queue: msg.queue } });
      }
    };

    socket.on("connect", onConnect);
    socket.on("trackStart", onTrackStart);
    socket.on("playerCreate", onCreate);
    socket.on("playerUpdate", onUpdate);
    socket.on("playerPause", onPause);
    socket.on("playerResume", onResume);
    socket.on("playerEnd", onEnd);
    socket.on("playerDestroy", onDestroy);
    socket.on("playerState", onStateUpdate);
    socket.on("memberJoin", onMemberJoin);
    socket.on("memberLeave", onMemberLeave);
    socket.on("queueUpdate", onQueueUpdate);

    return () => {
      socket.off("connect", onConnect);
      socket.off("trackStart", onTrackStart);
      socket.off("playerCreate", onCreate);
      socket.off("playerUpdate", onUpdate);
      socket.off("playerPause", onPause);
      socket.off("playerResume", onResume);
      socket.off("playerEnd", onEnd);
      socket.off("playerDestroy", onDestroy);
      socket.off("playerState", onStateUpdate);
      socket.off("memberJoin", onMemberJoin);
      socket.off("memberLeave", onMemberLeave);
      socket.off("queueUpdate", onQueueUpdate);
    };
  }, [socket, fetchState, userId, broadcastState]);

  useEffect(() => {
    if (!socket) return;
    let disconnectPollTimer: ReturnType<typeof setInterval> | null = null;
    let connectedSyncTimer: ReturnType<typeof setInterval> | null = null;

    const startDisconnectPolling = () => {
      stopDisconnectPolling();
      disconnectPollTimer = setInterval(() => {
        if (document.visibilityState === "visible") fetchState();
      }, 5_000);
    };
    const stopDisconnectPolling = () => {
      if (disconnectPollTimer) {
        clearInterval(disconnectPollTimer);
        disconnectPollTimer = null;
      }
    };
    const startConnectedSync = () => {
      stopConnectedSync();
      connectedSyncTimer = setInterval(() => {
        if (document.visibilityState === "visible") fetchState();
      }, 15_000);
    };
    const stopConnectedSync = () => {
      if (connectedSyncTimer) {
        clearInterval(connectedSyncTimer);
        connectedSyncTimer = null;
      }
    };

    const onSockConnect = () => {
      stopDisconnectPolling();
      startConnectedSync();
    };
    const onSockDisconnect = () => {
      stopConnectedSync();
      startDisconnectPolling();
    };

    socket.on("connect", onSockConnect);
    socket.on("disconnect", onSockDisconnect);

    if (socket.connected) {
      startConnectedSync();
    } else {
      startDisconnectPolling();
    }

    return () => {
      stopDisconnectPolling();
      stopConnectedSync();
      socket.off("connect", onSockConnect);
      socket.off("disconnect", onSockDisconnect);
    };
  }, [socket, fetchState]);

  useEffect(() => {
    if (!state?.current || !validGuild) return;
    const duration = state.current.length;
    if (duration > 0 && duration < 86400000 && state.position > duration + 5000) {
      fetchState();
    }
  }, [state?.position, state?.current, validGuild, fetchState]);

  const guardedPatch = useCallback(
    (body: Record<string, unknown>) => {
      if (!validGuild) return Promise.resolve();
      return api
        .patch(`/api/player/${guildId}`, body)
        .then(() => fetchState());
    },
    [guildId, validGuild, fetchState]
  );

  const skip = useCallback(
    () => {
      dispatch({ type: "SKIP_OPTIMISTIC" });
      return guardedPatch({ skipMode: "skip" });
    },
    [guardedPatch]
  );
  const previous = useCallback(
    () => {
      dispatch({ type: "SKIP_OPTIMISTIC" });
      return guardedPatch({ skipMode: "previous" });
    },
    [guardedPatch]
  );
  const stop = useCallback(() => {
    if (!validGuild) return Promise.resolve();
    return api
      .delete(`/api/player/${guildId}`)
      .then(() => dispatch({ type: "PLAYER_DESTROY" }));
  }, [guildId, validGuild]);
  const setVolume = useCallback(
    (vol: number) => guardedPatch({ volume: vol }),
    [guardedPatch]
  );
  const setLoop = useCallback(
    (mode: LoopMode) => guardedPatch({ loop: mode }),
    [guardedPatch]
  );
  const seek = useCallback(
    (posMs: number) => {
      dispatch({ type: "PLAYER_UPDATE", payload: { position: posMs } });
      return guardedPatch({ position: posMs });
    },
    [guardedPatch]
  );
  const addToQueue = useCallback(
    (uris: string[]) => guardedPatch({ add: uris }),
    [guardedPatch]
  );
  const createPlayer = useCallback(() => {
    if (!validGuild) return Promise.resolve();
    return api
      .post("/api/player", { guildId })
      .then(() => fetchState());
  }, [guildId, validGuild, fetchState]);
  const pause = useCallback(
    (value: boolean) => guardedPatch({ pause: value }),
    [guardedPatch]
  );
  const shuffle = useCallback(
    () => guardedPatch({ shuffle: true }),
    [guardedPatch]
  );
  const toggleAutoplay = useCallback(() => {
    const newValue = !state?.autoplay;
    return guardedPatch({ autoplay: newValue });
  }, [state?.autoplay, guardedPatch]);
  const removeFromQueue = useCallback(
    (index: number) => guardedPatch({ removeFromQueue: index }),
    [guardedPatch]
  );
  const moveInQueue = useCallback(
    (from: number, to: number) => guardedPatch({ moveInQueue: { from, to } }),
    [guardedPatch]
  );
  const skipToIndex = useCallback(
    (index: number) => {
      dispatch({ type: "SKIP_OPTIMISTIC" });
      return guardedPatch({ skipToIndex: index });
    },
    [guardedPatch]
  );
  const setFilter = useCallback(
    (preset: string) => guardedPatch({ filter: { preset } }),
    [guardedPatch]
  );
  const clearFilter = useCallback(
    () => guardedPatch({ filter: { clear: true } }),
    [guardedPatch]
  );

  const controls = useMemo(
    () => ({
      skip,
      previous,
      stop,
      setVolume,
      setLoop,
      seek,
      addToQueue,
      createPlayer,
      pause,
      shuffle,
      toggleAutoplay,
      removeFromQueue,
      moveInQueue,
      skipToIndex,
      setFilter,
      clearFilter,
    }),
    [
      skip,
      previous,
      stop,
      setVolume,
      setLoop,
      seek,
      addToQueue,
      createPlayer,
      pause,
      shuffle,
      toggleAutoplay,
      removeFromQueue,
      moveInQueue,
      skipToIndex,
      setFilter,
      clearFilter,
    ]
  );

  return { state, controls, refetch: fetchState };
}
