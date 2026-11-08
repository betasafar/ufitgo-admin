"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowLeft,
  Building,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Save,
  ShieldCheck,
  Sparkles,
  Target,
  User,
  Volume2,
  Wallet,
} from "lucide-react"
import { CallHistoryAndCtaPanel } from "@/components/calls/call-history-and-cta-panel"

interface ConciergeCallSession {
  callId: string
  channelName: string
  appId: string
  userId: string
  pilgrimName: string
  pilgrimPhone?: string | null
  callerName: string
  reason?: string
  bookingId?: string | number | null
  callNotes?: string
  direction: "ADMIN_TO_PILGRIM" | "PILGRIM_TO_ADMIN"
  status: "RINGING" | "ACCEPTED" | "DECLINED" | "ENDED" | "MISSED"
  adminUid: number
  adminToken: string
  createdAt: string
}

interface BookingItem {
  id: string | number
  bookingRef: string
  packageName: string
  destination?: string
  status: string
  totalPayable: number
  amountPaid: number
  registrationPaid: number
  packagePaid: number
  createdAt?: string
  payments?: Array<{
    id?: string | number
    reference?: string
    amount?: number
    paymentMethod?: string
    paymentStatus?: string
    createdAt?: string
  }>
}

interface SavingsGoalItem {
  id: string | number
  title: string
  targetAmount: number
  currentAmount: number
  status: string
}

interface TravelDocItem {
  id: string
  type: "PASSPORT" | "VISA" | "HEALTH_CARD"
  status?: string
  viewUrl?: string
  expiryDate?: string
}

declare global {
  interface Window {
    AgoraRTC?: any
  }
}

function loadAgoraSdkScript(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("Browser required"))
  if (window.AgoraRTC) return Promise.resolve(window.AgoraRTC)

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-agora-sdk="true"]') as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener("load", () => resolve(window.AgoraRTC))
      existing.addEventListener("error", () => reject(new Error("Failed to load Agora SDK")))
      return
    }
    const script = document.createElement("script")
    script.src = "https://download.agora.io/sdk/release/AgoraRTC_N-4.22.0.js"
    script.crossOrigin = "anonymous"
    script.referrerPolicy = "no-referrer"
    script.async = true
    script.dataset.agoraSdk = "true"
    script.onload = () => resolve(window.AgoraRTC)
    script.onerror = () => reject(new Error("Failed to load Agora WebRTC SDK"))
    document.head.appendChild(script)
  })
}

function formatCurrency(val: number | string | undefined) {
  const num = Number(val ?? 0)
  if (!Number.isFinite(num)) return "₦0"
  return `₦${num.toLocaleString("en-NG")}`
}

function formatDate(val?: string) {
  if (!val) return "—"
  const d = new Date(val)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export default function ConciergeCallDeskPage() {
  const params = useParams()
  const router = useRouter()
  const callId = String(params?.callId ?? "")

  const [session, setSession] = useState<ConciergeCallSession | null>(null)
  const [callStage, setCallStage] = useState<
    "connecting" | "ringing" | "connected" | "declined" | "ended" | "error"
  >("connecting")
  const [callError, setCallError] = useState("")
  const [isMuted, setIsMuted] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  // Call Notes & Live Transcription / Auto-Recording state
  const [notes, setNotes] = useState("")
  const [savingNotes, setSavingNotes] = useState(false)
  const [notesSavedNotice, setNotesSavedNotice] = useState("")
  const [isRecordingAudio, setIsRecordingAudio] = useState(false)
  const [liveTranscriptLines, setLiveTranscriptLines] = useState<string[]>([])
  const [uploadingRecording, setUploadingRecording] = useState(false)
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0)

  // Right-Side Pilgrim Dossier & Booking Record Sheet state
  const [dossierLoading, setDossierLoading] = useState(true)
  const [customer, setCustomer] = useState<any>(null)
  const [kyc, setKyc] = useState<any>(null)
  const [wallet, setWallet] = useState<any>(null)
  const [bookings, setBookings] = useState<BookingItem[]>([])
  const [savings, setSavings] = useState<SavingsGoalItem[]>([])
  const [travelDocs, setTravelDocs] = useState<TravelDocItem[]>([])

  const rtcClientRef = useRef<any>(null)
  const localAudioTrackRef = useRef<any>(null)
  const pollTimerRef = useRef<number | null>(null)
  const durationTimerRef = useRef<number | null>(null)
  const hasJoinedRtcRef = useRef(false)

  // WebAudio Mixer + MediaRecorder + Web Speech API refs
  const audioCtxRef = useRef<AudioContext | null>(null)
  const mixDestRef = useRef<MediaStreamAudioDestinationNode | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const speechRecRef = useRef<any>(null)
  const hasUploadedRecordingRef = useRef(false)
  const liveTranscriptRef = useRef<string[]>([])
  const notesRef = useRef("")
  const elapsedSecondsRef = useRef(0)

  useEffect(() => {
    notesRef.current = notes
  }, [notes])

  useEffect(() => {
    elapsedSecondsRef.current = elapsedSeconds
  }, [elapsedSeconds])

  const startAutoRecordingAndTranscriber = () => {
    try {
      if (!audioCtxRef.current && typeof window !== "undefined") {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
        if (AudioCtx) {
          const ctx = new AudioCtx()
          const dest = ctx.createMediaStreamDestination()
          audioCtxRef.current = ctx
          mixDestRef.current = dest

          if (localAudioTrackRef.current?.getMediaStreamTrack) {
            const micStream = new MediaStream([
              localAudioTrackRef.current.getMediaStreamTrack(),
            ])
            const micSource = ctx.createMediaStreamSource(micStream)
            micSource.connect(dest)
          }

          if (typeof MediaRecorder !== "undefined") {
            recordedChunksRef.current = []
            const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
              ? "audio/webm;codecs=opus"
              : MediaRecorder.isTypeSupported("audio/webm")
                ? "audio/webm"
                : ""
            const recorder = mimeType
              ? new MediaRecorder(dest.stream, { mimeType })
              : new MediaRecorder(dest.stream)
            recorder.ondataavailable = (ev) => {
              if (ev.data && ev.data.size > 0) {
                recordedChunksRef.current.push(ev.data)
              }
            }
            recorder.start(1000)
            mediaRecorderRef.current = recorder
            setIsRecordingAudio(true)
          }
        }
      }

      // Start browser Web Speech API live captioning if supported
      if (typeof window !== "undefined" && !speechRecRef.current) {
        const SpeechRecognition =
          (window as any).SpeechRecognition ||
          (window as any).webkitSpeechRecognition
        if (SpeechRecognition) {
          const recognition = new SpeechRecognition()
          recognition.continuous = true
          recognition.interimResults = false
          recognition.lang = "en-NG"
          recognition.onresult = (event: any) => {
            for (let i = event.resultIndex; i < event.results.length; i++) {
              if (event.results[i].isFinal) {
                const text = String(event.results[i][0]?.transcript || "").trim()
                if (text) {
                  const stamp = new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })
                  const line = `[${stamp}] Concierge: ${text}`
                  liveTranscriptRef.current = [...liveTranscriptRef.current, line]
                  setLiveTranscriptLines([...liveTranscriptRef.current])
                }
              }
            }
          }
          recognition.onerror = () => undefined
          recognition.start()
          speechRecRef.current = recognition
        }
      }
    } catch {
      // ignore browser audio recorder init errors
    }
  }

  const attachRemoteAudioToRecorder = (remoteAudioTrack: any) => {
    try {
      if (
        audioCtxRef.current &&
        mixDestRef.current &&
        remoteAudioTrack?.getMediaStreamTrack
      ) {
        const remoteStream = new MediaStream([
          remoteAudioTrack.getMediaStreamTrack(),
        ])
        const remoteSource =
          audioCtxRef.current.createMediaStreamSource(remoteStream)
        remoteSource.connect(mixDestRef.current)
      }
    } catch {
      // ignore
    }
  }

  const finalizeAndUploadRecording = async () => {
    if (!callId || hasUploadedRecordingRef.current) return
    hasUploadedRecordingRef.current = true
    setIsRecordingAudio(false)

    try {
      if (speechRecRef.current) {
        try {
          speechRecRef.current.stop()
        } catch {
          // ignore
        }
        speechRecRef.current = null
      }

      let audioBase64: string | undefined
      let mimeType = "audio/webm"

      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        await new Promise<void>((resolve) => {
          const rec = mediaRecorderRef.current!
          rec.onstop = () => resolve()
          try {
            rec.stop()
          } catch {
            resolve()
          }
        })
      }
      mediaRecorderRef.current = null

      if (audioCtxRef.current) {
        await audioCtxRef.current.close().catch(() => undefined)
        audioCtxRef.current = null
        mixDestRef.current = null
      }

      if (recordedChunksRef.current.length > 0) {
        const blob = new Blob(recordedChunksRef.current, { type: "audio/webm" })
        mimeType = blob.type || "audio/webm"
        audioBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(String(reader.result || ""))
          reader.onerror = () => resolve("")
          reader.readAsDataURL(blob)
        })
      }

      const transcriptText = liveTranscriptRef.current.join("\n")
      if (
        audioBase64 ||
        transcriptText.trim() ||
        notesRef.current.trim()
      ) {
        setUploadingRecording(true)
        await fetch(
          `/api/admin/customers/call/${encodeURIComponent(callId)}/recording`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              audioBase64: audioBase64 || undefined,
              mimeType,
              transcriptText,
              notes: notesRef.current,
              durationSeconds: elapsedSecondsRef.current,
            }),
          },
        ).catch(() => undefined)
        setUploadingRecording(false)
        setHistoryRefreshKey((k) => k + 1)
      }
    } catch {
      setUploadingRecording(false)
    }
  }

  const cleanupRtc = async () => {
    if (pollTimerRef.current) {
      window.clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
    if (durationTimerRef.current) {
      window.clearInterval(durationTimerRef.current)
      durationTimerRef.current = null
    }
    try {
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.stop()
        localAudioTrackRef.current.close()
        localAudioTrackRef.current = null
      }
      if (rtcClientRef.current) {
        await rtcClientRef.current.leave()
        rtcClientRef.current = null
      }
    } catch {
      // ignore cleanup errors
    }
  }

  useEffect(() => {
    return () => {
      void cleanupRtc()
    }
  }, [])

  // Load Pilgrim Record Sheet (Customer Profile, Wallet, Bookings & Payment Records, Savings, Travel Docs)
  const loadPilgrimDossier = async (userId: string) => {
    setDossierLoading(true)
    try {
      const [custRes, kycRes, walletRes, bookingsRes, savingsRes, docsRes] =
        await Promise.all([
          fetch(`/api/admin/customers/${userId}`, { cache: "no-store" }).catch(() => null),
          fetch(`/api/admin/customers/${userId}/kyc`, { cache: "no-store" }).catch(() => null),
          fetch(`/api/admin/customers/${userId}/wallet`, { cache: "no-store" }).catch(() => null),
          fetch(`/api/admin/customers/${userId}/bookings`, { cache: "no-store" }).catch(() => null),
          fetch(`/api/admin/customers/${userId}/savings`, { cache: "no-store" }).catch(() => null),
          fetch(`/api/admin/customers/${userId}/travel-docs`, { cache: "no-store" }).catch(() => null),
        ])

      const custPayload = custRes ? await custRes.json().catch(() => null) : null
      const kycPayload = kycRes ? await kycRes.json().catch(() => null) : null
      const walletPayload = walletRes ? await walletRes.json().catch(() => null) : null
      const bookingsPayload = bookingsRes ? await bookingsRes.json().catch(() => null) : null
      const savingsPayload = savingsRes ? await savingsRes.json().catch(() => null) : null
      const docsPayload = docsRes ? await docsRes.json().catch(() => null) : null

      setCustomer(custPayload?.data ?? custPayload ?? {})
      setKyc(kycPayload?.data ?? kycPayload ?? {})
      setWallet(walletPayload?.data ?? walletPayload ?? {})

      const rawBookings = Array.isArray(bookingsPayload?.data)
        ? bookingsPayload.data
        : Array.isArray(bookingsPayload)
          ? bookingsPayload
          : []
      setBookings(
        rawBookings.map((b: any) => ({
          id: b?.id ?? b?.bookingId,
          bookingRef:
            b?.bookingRef || b?.reference || `UFG-${String(b?.id || "").slice(0, 6)}`,
          packageName:
            b?.packageName || b?.package?.title || b?.tourName || "Umrah / Hajj Package",
          destination: b?.destination || b?.package?.destination || "Makkah & Madinah",
          status: b?.status || b?.bookingStatus || "PENDING",
          totalPayable: Number(
            b?.paymentBreakdown?.totalAmountPayable ??
              b?.totalAmountPayable ??
              b?.totalPrice ??
              b?.amount ??
              0,
          ),
          amountPaid: Number(
            b?.paymentBreakdown?.totalPaid ??
              b?.totalPaid ??
              b?.amountPaid ??
              b?.paidAmount ??
              0,
          ),
          registrationPaid: Number(
            b?.paymentBreakdown?.registration?.paid ?? b?.registrationAmountPaid ?? 0,
          ),
          packagePaid: Number(
            b?.paymentBreakdown?.packageAmountPaid ?? b?.packageAmountPaid ?? 0,
          ),
          createdAt: b?.createdAt || b?.created_at,
          payments: Array.isArray(b?.paymentBreakdown?.payments)
            ? b.paymentBreakdown.payments
            : Array.isArray(b?.payments)
              ? b.payments
              : [],
        })),
      )

      const rawSavings = Array.isArray(savingsPayload?.data)
        ? savingsPayload.data
        : Array.isArray(savingsPayload)
          ? savingsPayload
          : []
      setSavings(
        rawSavings.map((g: any) => ({
          id: g?.id,
          title: g?.title || "Savings Goal",
          targetAmount: Number(g?.targetAmount ?? 0),
          currentAmount: Number(g?.currentAmount ?? 0),
          status: g?.status || "ACTIVE",
        })),
      )

      const rawDocs = Array.isArray(docsPayload?.data)
        ? docsPayload.data
        : Array.isArray(docsPayload)
          ? docsPayload
          : []
      setTravelDocs(rawDocs)
    } finally {
      setDossierLoading(false)
    }
  }

  // Initialize Call Session & Connect Agora WebRTC
  useEffect(() => {
    if (!callId) return
    let disposed = false

    const initCallAndAudio = async () => {
      try {
        const res = await fetch(
          `/api/admin/customers/call/${encodeURIComponent(callId)}/status`,
          { cache: "no-store" },
        )
        const payload = await res.json().catch(() => null)
        const callData: ConciergeCallSession | undefined = payload?.data ?? payload
        if (!res.ok || !callData?.callId) {
          throw new Error(payload?.message || "Call session not found or has ended.")
        }
        if (disposed) return

        setSession(callData)
        if (callData.callNotes) {
          setNotes(callData.callNotes)
        }
        void loadPilgrimDossier(callData.userId)

        // If this was an inbound call from the pilgrim, mark it accepted as soon as admin opens the Call Desk
        if (
          callData.direction === "PILGRIM_TO_ADMIN" &&
          callData.status === "RINGING"
        ) {
          await fetch(
            `/api/admin/customers/call/${encodeURIComponent(callId)}/respond`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "accept" }),
            },
          ).catch(() => undefined)
          setCallStage("connected")
        } else {
          setCallStage(
            callData.status === "ACCEPTED" ? "connected" : "ringing",
          )
        }

        if (!hasJoinedRtcRef.current) {
          hasJoinedRtcRef.current = true
          const AgoraRTC = await loadAgoraSdkScript()
          const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" })
          rtcClientRef.current = client

          client.on("user-published", async (remoteUser: any, mediaType: string) => {
            await client.subscribe(remoteUser, mediaType)
            if (mediaType === "audio" && remoteUser.audioTrack) {
              remoteUser.audioTrack.play()
              setCallStage("connected")
              startAutoRecordingAndTranscriber()
              attachRemoteAudioToRecorder(remoteUser.audioTrack)
              if (!durationTimerRef.current) {
                durationTimerRef.current = window.setInterval(() => {
                  setElapsedSeconds((prev) => prev + 1)
                }, 1000)
              }
            }
          })

          client.on("user-left", () => {
            setCallStage("ended")
            void finalizeAndUploadRecording()
            void cleanupRtc()
          })

          await client.join(
            callData.appId,
            callData.channelName,
            callData.adminToken || null,
            callData.adminUid,
          )
          const micTrack = await AgoraRTC.createMicrophoneAudioTrack({
            AEC: true,
            ANS: true,
            AGC: true,
          })
          localAudioTrackRef.current = micTrack
          await client.publish([micTrack])
          if (callData.status === "ACCEPTED" || callData.direction === "PILGRIM_TO_ADMIN") {
            startAutoRecordingAndTranscriber()
          }
        }

        pollTimerRef.current = window.setInterval(async () => {
          try {
            const statusRes = await fetch(
              `/api/admin/customers/call/${encodeURIComponent(callId)}/status`,
              { cache: "no-store" },
            )
            const statusPayload = await statusRes.json().catch(() => null)
            const latest: ConciergeCallSession | undefined =
              statusPayload?.data ?? statusPayload
            if (!latest) return

            if (latest.status === "ACCEPTED") {
              setCallStage("connected")
              if (!durationTimerRef.current) {
                durationTimerRef.current = window.setInterval(() => {
                  setElapsedSeconds((prev) => prev + 1)
                }, 1000)
              }
            } else if (latest.status === "DECLINED") {
              setCallStage("declined")
              await cleanupRtc()
            } else if (latest.status === "ENDED" || latest.status === "MISSED") {
              setCallStage("ended")
              await finalizeAndUploadRecording()
              await cleanupRtc()
            }
          } catch {
            // ignore poll error
          }
        }, 2000)
      } catch (err) {
        if (!disposed) {
          setCallStage("error")
          setCallError(
            err instanceof Error ? err.message : "Could not connect call desk.",
          )
        }
      }
    }

    void initCallAndAudio()
    return () => {
      disposed = true
    }
  }, [callId])

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const rem = secs % 60
    return `${String(mins).padStart(2, "0")}:${String(rem).padStart(2, "0")}`
  }

  const toggleMute = () => {
    const next = !isMuted
    setIsMuted(next)
    if (localAudioTrackRef.current) {
      localAudioTrackRef.current.setMuted(next)
    }
  }

  const handleEndCall = async () => {
    setCallStage("ended")
    await finalizeAndUploadRecording()
    await cleanupRtc()
    if (callId) {
      await fetch(`/api/admin/customers/call/${encodeURIComponent(callId)}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "end" }),
      }).catch(() => undefined)
      setHistoryRefreshKey((k) => k + 1)
    }
  }

  const handleSaveNotes = async () => {
    if (!callId) return
    setSavingNotes(true)
    setNotesSavedNotice("")
    try {
      await fetch(`/api/admin/customers/call/${encodeURIComponent(callId)}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      })
      setNotesSavedNotice("Call notes & AI Call-to-Actions updated.")
      setHistoryRefreshKey((k) => k + 1)
      window.setTimeout(() => setNotesSavedNotice(""), 4000)
    } finally {
      setSavingNotes(false)
    }
  }

  const pilgrimName =
    session?.pilgrimName ||
    [customer?.firstName, customer?.lastName].filter(Boolean).join(" ") ||
    "UfitGo Pilgrim"
  const pilgrimPhone =
    session?.pilgrimPhone || customer?.phone || customer?.phoneNumber || "Not provided"
  const pilgrimEmail = customer?.email || "Not provided"

  const financialTotals = useMemo(() => {
    const ufitFlexBalance = Number(
      wallet?.balance ?? customer?.walletBalance ?? 0,
    )
    const totalSavings = savings.reduce(
      (sum, g) => sum + Number(g.currentAmount || 0),
      0,
    )
    const totalBookingPaid = bookings.reduce(
      (sum, b) => sum + Number(b.amountPaid || 0),
      0,
    )
    const totalBookingOutstanding = bookings.reduce(
      (sum, b) =>
        sum + Math.max(0, Number(b.totalPayable || 0) - Number(b.amountPaid || 0)),
      0,
    )
    return {
      ufitFlexBalance,
      totalSavings,
      totalBookingPaid,
      totalBookingOutstanding,
    }
  }, [wallet, customer, savings, bookings])

  return (
    <main className="space-y-6 p-5 sm:p-8">
      {/* Top Bar */}
      <header className="flex flex-col justify-between gap-4 border-b border-[#d9dfdc] pb-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              session?.userId
                ? router.push(`/dashboard/customers/${session.userId}`)
                : router.push("/dashboard/customers")
            }
            className="inline-flex size-10 items-center justify-center rounded-lg border border-[#d9dfdc] bg-white text-[#35443e] hover:bg-[#edf3f0]"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block size-2.5 animate-pulse rounded-full bg-[#10b981]" />
              <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#07845f]">
                Live Concierge Call Desk ·{" "}
                {session?.direction === "PILGRIM_TO_ADMIN"
                  ? "Inbound Call from Pilgrim"
                  : "Outbound Call to Pilgrim"}
              </span>
            </div>
            <h1 className="mt-1 font-brand text-2xl font-bold text-[#17201c]">
              {pilgrimName}
            </h1>
          </div>
        </div>

        {session?.userId && (
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href={`/dashboard/customers/${session.userId}`}
              className="inline-flex items-center gap-2 rounded-lg border border-[#cbd5d0] bg-white px-4 py-2 text-xs font-bold text-[#17201c] hover:bg-[#edf3f0]"
            >
              Open Full Customer Profile <ExternalLink className="size-3.5" />
            </Link>
          </div>
        )}
      </header>

      {/* 2-Column Split Screen: Left Call Console | Right Booking & Payment Record Sheet */}
      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        {/* ===================================================================
            LEFT COLUMN: ACTIVE VOICE CALL CONSOLE + CALL NOTES
           =================================================================== */}
        <div className="space-y-6">
          {/* Dark Emerald Call Pod */}
          <section className="overflow-hidden rounded-2xl border border-[#0f5338] bg-gradient-to-b from-[#063722] to-[#042215] text-white shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#fde68a]">
                Agora Voice Channel
              </span>
              <Volume2 className="size-4 text-[#a7f3d0]" />
            </div>

            <div className="px-6 py-7 text-center">
              <div className="mx-auto mb-4 grid size-20 place-items-center rounded-full border-2 border-[#fde68a]/40 bg-[#0f5338] text-2xl font-bold text-[#fde68a] shadow-inner">
                {pilgrimName.slice(0, 2).toUpperCase()}
              </div>

              <h2 className="font-brand text-xl font-bold text-white">
                {pilgrimName}
              </h2>
              <p className="mt-1 text-xs text-white/75">{pilgrimPhone}</p>
              {session?.reason && (
                <p className="mt-2 inline-block rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium text-[#fde68a]">
                  {session.reason}
                </p>
              )}

              {/* Call Status Indicator */}
              <div className="mt-5">
                {callStage === "connecting" && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-black/30 px-4 py-1.5 text-xs font-semibold text-[#a7f3d0]">
                    <Loader2 className="size-3.5 animate-spin" /> Connecting voice channel…
                  </span>
                )}
                {callStage === "ringing" && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-[#f59e0b]/20 px-4 py-1.5 text-xs font-bold text-[#fde68a]">
                    <span className="size-2 animate-ping rounded-full bg-[#fbbf24]" />
                    Ringing Pilgrim&apos;s UfitGo App…
                  </span>
                )}
                {callStage === "connected" && (
                  <div className="flex flex-col items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full bg-[#10b981]/25 px-4 py-1.5 font-mono text-sm font-bold text-[#6ee7b7]">
                      <span className="size-2 rounded-full bg-[#34d399]" />
                      Connected · {formatDuration(elapsedSeconds)}
                    </span>
                    {isRecordingAudio && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ef4444]/25 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#fecaca]">
                        <span className="size-2 animate-pulse rounded-full bg-[#ef4444]" />
                        Auto-Recording &amp; AI Transcriber Active
                      </span>
                    )}
                  </div>
                )}
                {uploadingRecording && (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#fde68a]">
                    <Loader2 className="size-3.5 animate-spin" /> Saving call recording &amp; extracting Call-to-Actions…
                  </p>
                )}
                {callStage === "declined" && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-[#ef4444]/25 px-4 py-1.5 text-xs font-bold text-[#fca5a5]">
                    Pilgrim declined or is unavailable
                  </span>
                )}
                {callStage === "ended" && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold text-white/80">
                    Call Ended ({formatDuration(elapsedSeconds)})
                  </span>
                )}
                {callStage === "error" && (
                  <p className="mt-2 text-xs text-[#fca5a5]">{callError}</p>
                )}
              </div>

              {/* Audio Controls */}
              <div className="mt-7 flex items-center justify-center gap-4">
                {(callStage === "ringing" || callStage === "connected") && (
                  <button
                    type="button"
                    onClick={toggleMute}
                    className={`flex h-12 items-center gap-2 rounded-full px-5 text-xs font-bold transition ${
                      isMuted
                        ? "bg-[#fbbf24] text-[#17201c]"
                        : "bg-white/15 text-white hover:bg-white/25"
                    }`}
                  >
                    {isMuted ? (
                      <>
                        <MicOff className="size-4" /> Unmute
                      </>
                    ) : (
                      <>
                        <Mic className="size-4" /> Mute Mic
                      </>
                    )}
                  </button>
                )}

                {callStage === "ringing" || callStage === "connected" ? (
                  <button
                    type="button"
                    onClick={() => void handleEndCall()}
                    className="flex h-12 items-center gap-2 rounded-full bg-[#ef4444] px-6 text-xs font-bold text-white shadow-lg transition hover:bg-[#dc2626]"
                  >
                    <PhoneOff className="size-4" /> End Call
                  </button>
                ) : (
                  session?.userId && (
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await fetch(
                          `/api/admin/customers/${encodeURIComponent(session.userId)}/call/initiate`,
                          {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              callerName: "UfitGo Pilgrim Concierge",
                              reason: session.reason,
                              bookingId: session.bookingId,
                            }),
                          },
                        )
                        const payload = await res.json().catch(() => null)
                        const nextCall = payload?.data ?? payload
                        if (nextCall?.callId) {
                          router.replace(`/dashboard/calls/${nextCall.callId}`)
                        }
                      }}
                      className="flex h-11 items-center gap-2 rounded-full bg-[#10b981] px-5 text-xs font-bold text-white hover:bg-[#059669]"
                    >
                      <Phone className="size-4" /> Call Again
                    </button>
                  )
                )}
              </div>

              {pilgrimPhone !== "Not provided" && (
                <div className="mt-5 border-t border-white/10 pt-4">
                  <a
                    href={`tel:${pilgrimPhone}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#a7f3d0] hover:underline"
                  >
                    <Phone className="size-3.5" /> Fallback Direct GSM: {pilgrimPhone}
                  </a>
                </div>
              )}
            </div>
          </section>

          {/* Live Speech Transcriber Feed */}
          {liveTranscriptLines.length > 0 && (
            <section className="rounded-2xl border border-[#cfeee0] bg-[#f4fbf8] p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#0d7d5f]">
                  <Sparkles className="size-3.5" /> Live Conversation Transcript
                </h3>
                <span className="text-[10px] font-bold text-[#5d6b65]">
                  {liveTranscriptLines.length} line(s)
                </span>
              </div>
              <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-[#dbeee4] bg-white p-2.5 text-xs text-[#17201c]">
                {liveTranscriptLines.map((line, idx) => (
                  <p key={idx} className="leading-5">
                    {line}
                  </p>
                ))}
              </div>
            </section>
          )}

          {/* Live Call Notes Box */}
          <section className="rounded-2xl border border-[#dbe2de] bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#17201c]">
                <FileText className="size-4 text-[#07845f]" /> Concierge Call Notes
              </h3>
              {notesSavedNotice && (
                <span className="text-[11px] font-semibold text-[#07845f]">
                  {notesSavedNotice}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-[#68716d]">
              Jot down payment promises, installment agreements, or visa/document
              follow-ups while speaking with the pilgrim.
            </p>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Pilgrim was debited ₦250,000 via transfer that hasn't reflected, or promised ₦500k installment by Friday..."
              className="mt-3 w-full rounded-xl border border-[#d9dfdc] bg-[#f8faf9] p-3 text-sm text-[#17201c] outline-none focus:border-[#07845f]"
            />
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {[
                {
                  label: "⚠️ Failed / Uncredited Transaction",
                  snippet:
                    "FAILED TRANSACTION: Pilgrim reported a debit/transfer that has not reflected in their wallet/booking. Needs urgent Treasury & BaaS reconciliation.",
                },
                {
                  label: "🚨 Unhappy Customer / Escalation",
                  snippet:
                    "UNHAPPY CUSTOMER: Pilgrim expressed frustration regarding service delay and needs priority senior concierge follow-up.",
                },
                {
                  label: "💳 Payment Promise",
                  snippet:
                    "PAYMENT PROMISE: Pilgrim confirmed they will transfer their next package installment this week.",
                },
                {
                  label: "🛂 Missing Passport / NIN",
                  snippet:
                    "DOCUMENTS PENDING: Pilgrim will upload international passport bio-data page and NIN slip within 48 hours.",
                },
              ].map((tag) => (
                <button
                  key={tag.label}
                  type="button"
                  onClick={() =>
                    setNotes((prev) =>
                      prev.trim() ? `${prev.trim()}\n${tag.snippet}` : tag.snippet,
                    )
                  }
                  className="rounded-full border border-[#d3dad7] bg-[#f7faf9] px-2.5 py-1 text-[11px] font-semibold text-[#35443e] transition hover:border-[#07845f] hover:bg-[#eaf9f3] hover:text-[#07845f]"
                >
                  {tag.label}
                </button>
              ))}
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => void handleSaveNotes()}
                disabled={savingNotes}
                className="inline-flex items-center gap-2 rounded-lg bg-[#07845f] px-4 py-2 text-xs font-bold text-white hover:bg-[#066c4e] disabled:opacity-60"
              >
                {savingNotes ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Save className="size-3.5" />
                )}
                Save Call Notes
              </button>
            </div>
          </section>
        </div>

        {/* ===================================================================
            RIGHT COLUMN: PILGRIM BOOKING, PAYMENT & WALLET RECORD SHEET
           =================================================================== */}
        <div className="space-y-6">
          {dossierLoading ? (
            <div className="grid min-h-80 place-items-center rounded-2xl border border-[#dbe2de] bg-white p-8">
              <div className="flex items-center gap-3 text-sm font-semibold text-[#68716d]">
                <Loader2 className="size-5 animate-spin text-[#07845f]" />
                Loading pilgrim booking &amp; payment records…
              </div>
            </div>
          ) : (
            <>
              {/* 1. Financial & Identity Summary Strip */}
              <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
                  <div className="flex items-center justify-between text-xs font-bold text-[#68716d]">
                    <span>UFITFLEX WALLET</span>
                    <Wallet className="size-4 text-[#07845f]" />
                  </div>
                  <p className="mt-2 font-brand text-xl font-bold text-[#17201c]">
                    {formatCurrency(financialTotals.ufitFlexBalance)}
                  </p>
                  <p className="mt-1 text-[11px] text-[#68716d]">
                    NUBAN: {wallet?.virtualAccountNumber || "Not generated"}
                  </p>
                </div>

                <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
                  <div className="flex items-center justify-between text-xs font-bold text-[#68716d]">
                    <span>TARGET SAVINGS</span>
                    <Target className="size-4 text-[#07845f]" />
                  </div>
                  <p className="mt-2 font-brand text-xl font-bold text-[#17201c]">
                    {formatCurrency(financialTotals.totalSavings)}
                  </p>
                  <p className="mt-1 text-[11px] text-[#68716d]">
                    {savings.length} active savings plan(s)
                  </p>
                </div>

                <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
                  <div className="flex items-center justify-between text-xs font-bold text-[#68716d]">
                    <span>TOTAL BOOKINGS PAID</span>
                    <CheckCircle2 className="size-4 text-[#10b981]" />
                  </div>
                  <p className="mt-2 font-brand text-xl font-bold text-[#0c6b50]">
                    {formatCurrency(financialTotals.totalBookingPaid)}
                  </p>
                  <p className="mt-1 text-[11px] text-[#68716d]">
                    Across {bookings.length} package booking(s)
                  </p>
                </div>

                <div className="rounded-xl border border-[#dbe2de] bg-white p-4">
                  <div className="flex items-center justify-between text-xs font-bold text-[#68716d]">
                    <span>OUTSTANDING BALANCE</span>
                    <CreditCard className="size-4 text-[#d97706]" />
                  </div>
                  <p className="mt-2 font-brand text-xl font-bold text-[#b45309]">
                    {formatCurrency(financialTotals.totalBookingOutstanding)}
                  </p>
                  <p className="mt-1 text-[11px] text-[#68716d]">
                    KYC Tier {kyc?.tier || customer?.kycTier || 1} ·{" "}
                    {kyc?.status || customer?.kycStatus || "Verified"}
                  </p>
                </div>
              </section>

              {/* 1.5. AI Call-to-Actions (Follow-Up Queue) & Past Call Recordings */}
              {session?.userId && (
                <CallHistoryAndCtaPanel
                  customerId={session.userId}
                  bookingId={session.bookingId ?? undefined}
                  compact
                  refreshKey={historyRefreshKey}
                />
              )}

              {/* 2. Bookings & Payment Record Sheet (Primary Focus During Call) */}
              <section className="rounded-2xl border border-[#dbe2de] bg-white p-6 shadow-xs">
                <div className="flex items-center justify-between border-b border-[#edf2ef] pb-4">
                  <div>
                    <h2 className="font-brand text-lg font-bold text-[#17201c]">
                      Package Bookings &amp; Payment Records
                    </h2>
                    <p className="text-xs text-[#68716d]">
                      Live booking ledger, amount paid vs. outstanding balance, and
                      installment payment history.
                    </p>
                  </div>
                  <span className="rounded-full bg-[#eaf9f3] px-3 py-1 text-xs font-bold text-[#07845f]">
                    {bookings.length} Booking{bookings.length === 1 ? "" : "s"}
                  </span>
                </div>

                {bookings.length === 0 ? (
                  <div className="py-10 text-center text-sm text-[#68716d]">
                    This pilgrim has no package bookings yet. Check their Target
                    Savings goals below.
                  </div>
                ) : (
                  <div className="mt-4 space-y-4">
                    {bookings.map((b) => {
                      const remaining = Math.max(0, b.totalPayable - b.amountPaid)
                      const progressPct =
                        b.totalPayable > 0
                          ? Math.min(
                              100,
                              Math.round((b.amountPaid / b.totalPayable) * 100),
                            )
                          : 0
                      const isHighlighted =
                        session?.bookingId &&
                        String(session.bookingId) === String(b.id)

                      return (
                        <div
                          key={b.id}
                          className={`rounded-xl border p-5 ${
                            isHighlighted
                              ? "border-[#07845f] bg-[#f4fbf8]"
                              : "border-[#e2e8e5] bg-[#fbfcfb]"
                          }`}
                        >
                          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded bg-[#07845f]/10 px-2 py-0.5 font-mono text-xs font-bold text-[#07845f]">
                                  {b.bookingRef}
                                </span>
                                <span className="rounded-full bg-[#eaf9f3] px-2.5 py-0.5 text-[11px] font-bold uppercase text-[#0c6b50]">
                                  {b.status}
                                </span>
                                {isHighlighted && (
                                  <span className="rounded-full bg-[#fef3c7] px-2.5 py-0.5 text-[11px] font-bold text-[#92400e]">
                                    Call Topic
                                  </span>
                                )}
                              </div>
                              <h3 className="mt-2 text-base font-bold text-[#17201c]">
                                {b.packageName}
                              </h3>
                              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[#68716d]">
                                <MapPin className="size-3.5" /> {b.destination} ·
                                Booked {formatDate(b.createdAt)}
                              </p>
                            </div>

                            <Link
                              href={`/dashboard/journeys/${b.id}`}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[#d9dfdc] bg-white px-3 py-1.5 text-xs font-bold text-[#07845f] hover:bg-[#eaf9f3]"
                            >
                              Open Booking <ExternalLink className="size-3.5" />
                            </Link>
                          </div>

                          {/* Payment Breakdown Grid */}
                          <div className="mt-4 grid gap-3 rounded-lg border border-[#e5ece8] bg-white p-3.5 sm:grid-cols-4">
                            <div>
                              <span className="block text-[10px] font-bold uppercase text-[#78817d]">
                                Total Package
                              </span>
                              <span className="mt-0.5 block text-sm font-bold text-[#17201c]">
                                {formatCurrency(b.totalPayable)}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[10px] font-bold uppercase text-[#78817d]">
                                Amount Paid ({progressPct}%)
                              </span>
                              <span className="mt-0.5 block text-sm font-bold text-[#0c6b50]">
                                {formatCurrency(b.amountPaid)}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[10px] font-bold uppercase text-[#78817d]">
                                Remaining Balance
                              </span>
                              <span className="mt-0.5 block text-sm font-bold text-[#b45309]">
                                {formatCurrency(remaining)}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[10px] font-bold uppercase text-[#78817d]">
                                Reg / Package Split
                              </span>
                              <span className="mt-0.5 block text-xs font-semibold text-[#35443e]">
                                Reg: {formatCurrency(b.registrationPaid)} · Pkg:{" "}
                                {formatCurrency(b.packagePaid)}
                              </span>
                            </div>
                          </div>

                          {/* Individual Payment Records / Receipts if present */}
                          {b.payments && b.payments.length > 0 && (
                            <div className="mt-3">
                              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#68716d]">
                                Payment Transactions ({b.payments.length})
                              </p>
                              <div className="divide-y divide-[#edf2ef] rounded-lg border border-[#e5ece8] bg-white">
                                {b.payments.map((pmt, idx) => (
                                  <div
                                    key={pmt.id || idx}
                                    className="flex items-center justify-between px-3.5 py-2 text-xs"
                                  >
                                    <div>
                                      <span className="font-mono font-semibold text-[#17201c]">
                                        {pmt.reference || `PMT-${idx + 1}`}
                                      </span>
                                      <span className="ml-2 text-[#68716d]">
                                        {pmt.paymentMethod || "Transfer"} ·{" "}
                                        {formatDate(pmt.createdAt)}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-[#0c6b50]">
                                        {formatCurrency(pmt.amount)}
                                      </span>
                                      <span className="rounded bg-[#eaf9f3] px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#07845f]">
                                        {pmt.paymentStatus || "PAID"}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>

              {/* 3. Target Savings Goals & Travel Docs Readiness Row */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Target Savings Plans */}
                <section className="rounded-2xl border border-[#dbe2de] bg-white p-5 shadow-xs">
                  <h3 className="font-brand text-base font-bold text-[#17201c]">
                    Active Target Savings Goals ({savings.length})
                  </h3>
                  {savings.length === 0 ? (
                    <p className="mt-4 text-xs text-[#68716d]">
                      No UfitSave goals created yet.
                    </p>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {savings.map((g) => {
                        const pct =
                          g.targetAmount > 0
                            ? Math.min(
                                100,
                                Math.round(
                                  (g.currentAmount / g.targetAmount) * 100,
                                ),
                              )
                            : 0
                        return (
                          <div
                            key={g.id}
                            className="rounded-xl border border-[#e5ece8] bg-[#f8faf9] p-3.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-[#17201c]">
                                {g.title}
                              </span>
                              <span className="text-xs font-bold text-[#07845f]">
                                {pct}%
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-[#68716d]">
                              Saved:{" "}
                              <strong className="text-[#17201c]">
                                {formatCurrency(g.currentAmount)}
                              </strong>{" "}
                              of {formatCurrency(g.targetAmount)}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </section>

                {/* Travel Documents Vault & Profile Info */}
                <section className="rounded-2xl border border-[#dbe2de] bg-white p-5 shadow-xs">
                  <h3 className="font-brand text-base font-bold text-[#17201c]">
                    Travel Docs Vault &amp; Pilgrim Profile
                  </h3>
                  <div className="mt-3 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between rounded-lg bg-[#f8faf9] px-3 py-2">
                      <span className="flex items-center gap-2 font-semibold text-[#5a6560]">
                        <Mail className="size-3.5" /> Email
                      </span>
                      <span className="font-bold text-[#17201c]">
                        {pilgrimEmail}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-[#f8faf9] px-3 py-2">
                      <span className="flex items-center gap-2 font-semibold text-[#5a6560]">
                        <Building className="size-3.5" /> Virtual Account
                      </span>
                      <span className="font-bold text-[#17201c]">
                        {wallet?.virtualAccountNumber
                          ? `${wallet.virtualAccountNumber} (${wallet.virtualBankName || "Partner Bank"})`
                          : "Not generated"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-[#f8faf9] px-3 py-2">
                      <span className="flex items-center gap-2 font-semibold text-[#5a6560]">
                        <ShieldCheck className="size-3.5" /> Travel Documents
                      </span>
                      <span className="font-bold text-[#07845f]">
                        {travelDocs.length} / 3 Uploaded (
                        {travelDocs.map((d) => d.type).join(", ") || "None"})
                      </span>
                    </div>
                  </div>
                </section>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
