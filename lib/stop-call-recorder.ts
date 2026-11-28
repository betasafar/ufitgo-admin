export function stopCallRecorder(recorder: MediaRecorder, timeoutMs = 8000): Promise<void> {
  if (recorder.state === "inactive") return Promise.resolve()
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer)
      recorder.removeEventListener("stop", onStop)
      recorder.removeEventListener("error", onError)
    }
    const onStop = () => {
      cleanup()
      resolve()
    }
    const onError = () => {
      cleanup()
      reject(new Error("Call recorder failed to stop"))
    }
    const timer = setTimeout(() => {
      cleanup()
      reject(new Error("Call recorder did not finish in time"))
    }, timeoutMs)
    recorder.addEventListener("stop", onStop, { once: true })
    recorder.addEventListener("error", onError, { once: true })
    try {
      recorder.stop()
    } catch (error) {
      cleanup()
      reject(error)
    }
  })
}
