export type CallRecordingPayload = {
  audioBase64?: string
  mimeType: string
  transcriptText: string
  notes: string
  durationSeconds: number
}

export async function uploadCallRecording(callId: string, payload: CallRecordingPayload): Promise<"saved" | "captions-only" | "failed"> {
  const url = `/api/admin/customers/call/${encodeURIComponent(callId)}/recording`
  const send = async (data: CallRecordingPayload) => {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const result = await response.json()
    const saved = result?.data ?? result
    if ((data.audioBase64 && !saved?.recordingUrl) ||
        (data.transcriptText && !saved?.transcript)) {
      throw new Error("Recording or captions missing from saved call")
    }
  }
  try {
    await send(payload)
    return "saved"
  } catch (error) {
    console.warn("[ConciergeAudio] RECORDING_UPLOAD_FAILED", error instanceof Error ? error.message : "unknown")
    try {
      await send({ ...payload, audioBase64: undefined })
      return "captions-only"
    } catch (fallbackError) {
      console.warn("[ConciergeAudio] CAPTION_SAVE_FAILED", fallbackError instanceof Error ? fallbackError.message : "unknown")
      return "failed"
    }
  }
}
