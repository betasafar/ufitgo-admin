export async function runCallRtcSetup(
  setup: () => Promise<void>,
  isAborted: () => boolean,
  onFailure: () => Promise<void>,
): Promise<boolean> {
  try {
    await setup()
    return !isAborted()
  } catch (error) {
    if (isAborted()) {
      console.info("[ConciergeAudio] ADMIN_RTC_SETUP_CANCELLED")
      return false
    }
    await onFailure()
    throw error
  }
}
