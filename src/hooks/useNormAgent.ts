import { useEffect, useMemo, useRef, useState } from "react";
import { useWebchat } from "bland-client-js-sdk/react";

export function useNormAgent(agentId: string) {
  const [status, setStatus] = useState("idle");
  const [streamSid, setStreamSid] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>("");

  const getToken = useMemo(() => {
    return async () => {
      // In a real app, you fetch this from your secure backend
      // which uses the Bland Admin Client to generate a session token.
      const response = await fetch("http://localhost:8001/api/agent-authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId })
      });
      if (!response.ok) throw new Error("Agent authorization failed");
      return response.json();
    };
  }, [agentId]);

  const { state, start, stop, webchat } = useWebchat({
    agentId,
    getToken
  });

  useEffect(() => {
    const off = [
      webchat.on("open", () => setStatus("connected")),
      webchat.on("message", (m: any) => {
        if (!streamSid && m?.streamSid) setStreamSid(m.streamSid);
      }),
      webchat.on("update", (m: any) => {
        const who = m?.payload?.type === "assistant" ? "Assistant: " : "You: ";
        const t = m?.payload?.text;
        if (t && typeof t === "string") {
          setTranscript((cur) => cur + "\n" + who + t);
        }
      }),
      webchat.on("closed", () => setStatus("closed")),
      webchat.on("error", (e: any) => setStatus("error"))
    ];
    return () => off.forEach((u) => u());
  }, [webchat, streamSid]);

  return {
    isListening: state === "open" || state === "connecting",
    transcript,
    status,
    startListening: () => { setStatus("authorizing"); start(); },
    stopListening: () => stop(),
  };
}
