"use client";

import { useMutation } from "@tanstack/react-query";
import { Room, RoomEvent, Track } from "livekit-client";
import { useCallback, useEffect, useRef } from "react";
import { useTRPC } from "@/trpc/client";
import { injectTextIntoActiveField } from "../lib/text-injection";
import { useVoiceStore } from "../stores/voice-store";
import type { AgentState, VoiceMode } from "../types";

export function useVoiceSession() {
  const trpc = useTRPC();
  const roomRef = useRef<Room | null>(null);
  const {
    setMode,
    setAgentState,
    setConnected,
    appendTranscript,
    setInterimTranscript,
    setError,
    reset,
  } = useVoiceStore();

  const tokenMutation = useMutation(trpc.voice.getToken.mutationOptions());

  const connect = useCallback(
    async (roomType: VoiceMode) => {
      if (roomType === "idle") {
        return;
      }

      try {
        if (roomRef.current?.state === "connected") {
          await roomRef.current.disconnect();
        }

        const { token, wsUrl } = await tokenMutation.mutateAsync({
          roomType,
        });
        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
          audioCaptureDefaults: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48_000,
            channelCount: 1,
          },
        });

        room.on(RoomEvent.Connected, () => {
          setConnected(true);
          setAgentState("connecting");
        });

        room.on(RoomEvent.Disconnected, () => {
          setConnected(false);
          setAgentState("disconnected");
        });

        room.on(
          RoomEvent.DataReceived,
          (payload, _participant, _kind, topic) => {
            const data = JSON.parse(new TextDecoder().decode(payload));

            if (topic === "dictation" && data.type === "dictation_text") {
              if (data.final) {
                appendTranscript(data.text);
                setInterimTranscript("");
                injectTextIntoActiveField(data.text);
              } else {
                setInterimTranscript(data.text);
              }
            }

            if (topic === "navigation" && data.type === "navigate") {
              window.location.href = data.destination;
            }
          }
        );

        room.on(
          RoomEvent.ParticipantMetadataChanged,
          (metadata, participant) => {
            if (participant?.isAgent) {
              try {
                const meta = JSON.parse(metadata || "{}");
                if (meta.agentState) {
                  setAgentState(meta.agentState as AgentState);
                }
              } catch {
                // ignore parse errors
              }
            }
          }
        );

        room.on(
          RoomEvent.TrackSubscribed,
          (track, _publication, participant) => {
            if (participant?.isAgent && track.kind === Track.Kind.Audio) {
              setAgentState("speaking");
              const audioEl = document.createElement("audio");
              audioEl.autoplay = true;
              track.attach(audioEl);
            }
          }
        );

        await room.connect(wsUrl, token);
        await room.localParticipant.setMicrophoneEnabled(true);

        roomRef.current = room;
        setMode(roomType);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Connection failed");
      }
    },
    [
      tokenMutation,
      setMode,
      setAgentState,
      setConnected,
      appendTranscript,
      setInterimTranscript,
      setError,
    ]
  );

  const disconnect = useCallback(async () => {
    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
    }
    reset();
  }, [reset]);

  const toggleMute = useCallback(async () => {
    if (!roomRef.current) {
      return;
    }
    const current = roomRef.current.localParticipant.isMicrophoneEnabled;
    await roomRef.current.localParticipant.setMicrophoneEnabled(!current);
    useVoiceStore.getState().setMuted(current);
  }, []);

  useEffect(
    () => () => {
      roomRef.current?.disconnect();
    },
    []
  );

  return { connect, disconnect, toggleMute, room: roomRef.current };
}
