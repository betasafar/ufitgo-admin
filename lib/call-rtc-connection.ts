export type CallRtcConnection = "connected" | "reconnecting" | "failed"

export function getCallRtcConnection(state: string, previouslyConnected: boolean): CallRtcConnection | null {
  if (state === "CONNECTED") return "connected"
  if (state === "RECONNECTING") return "reconnecting"
  if (state === "DISCONNECTED" && previouslyConnected) return "failed"
  return null
}
