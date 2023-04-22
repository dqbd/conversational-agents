import { useEffect, useRef, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import hark from "hark"
import { cn } from "~/utils/cn"
import { env } from "~/env.mjs"

const DID_API = {
  key: env.NEXT_PUBLIC_D_ID_API_KEY,
  url: "https://api.d-id.com",
} as const

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function Video(props: {
  name: string
  avatar: string
  onReady: (mutate: (value: string) => Promise<void>) => void
}) {
  const initRef = useRef<boolean>(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const promiseRef = useRef<Promise<unknown>>(Promise.resolve())
  const sessionRef = useRef<{ streamId: string; sessionId: string } | null>(
    null
  )

  const [ready, setReady] = useState<boolean>(false)

  const eventRef = useRef<ReturnType<typeof hark> | null>(null)

  const sendData = useMutation(async (message: string) => {
    if (sessionRef.current == null) return
    console.log({ sessionRef })

    const talkResponse = await fetch(
      `${DID_API.url}/talks/streams/${sessionRef.current.streamId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${DID_API.key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          script: {
            type: "text",
            provider: {
              type: "microsoft",
              voice_id: "Guy",
            },
            ssml: "false",
            input: message,
          },
          config: { fluent: "false", pad_audio: "0.0" },
          session_id: sessionRef.current.sessionId,
        }),
      }
    )

    const payload: { duration: number } = await talkResponse.json()

    await new Promise<void>((resolve) => {
      let firstSpeaking = true
      let timeout: number = 0

      eventRef.current?.on("speaking", () => {
        if (firstSpeaking) {
          console.log("is speaking")

          timeout = window.setTimeout(() => {
            console.log("is not speaking")
            resolve()
          }, Math.max(0, payload.duration - 5) * 1050)
        }
        firstSpeaking = false
      })
    })

    console.log("yielding back to LLM")
  })

  const connect = useMutation(async () => {
    const sessionResponse = await fetch(`${DID_API.url}/talks/streams`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${DID_API.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ source_url: props.avatar }),
    })

    const {
      id: streamId,
      session_id: sessionId,
      offer,
      ice_servers: iceServers,
    } = await sessionResponse.json()

    const peerConnection = new RTCPeerConnection({ iceServers })

    function onStateChange() {
      if (
        peerConnection.iceConnectionState === "connected" &&
        peerConnection.signalingState === "stable"
      ) {
        sessionRef.current = { streamId, sessionId }
        props.onReady(sendData.mutateAsync)
        setReady(true)
      }
    }

    function onIceCandidate(event: RTCPeerConnectionIceEvent) {
      if (event.candidate) {
        const { candidate, sdpMid, sdpMLineIndex } = event.candidate
        promiseRef.current = promiseRef.current.then(async () => {
          await wait(1500)

          return fetch(`${DID_API.url}/talks/streams/${streamId}/ice`, {
            method: "POST",
            headers: {
              Authorization: `Basic ${DID_API.key}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              candidate,
              sdpMid,
              sdpMLineIndex,
              session_id: sessionId,
            }),
          })
        })
      }
    }

    function onTrack(event: RTCTrackEvent) {
      const video = videoRef.current
      if (!video) return

      const stream = event.streams[0]!
      video.srcObject = stream
      eventRef.current = hark(stream)
    }

    peerConnection.addEventListener("icecandidate", onIceCandidate, true)
    peerConnection.addEventListener("signalingstatechange", onStateChange)
    peerConnection.addEventListener("track", onTrack, true)
    peerConnection.addEventListener(
      "iceconnectionstatechange",
      onStateChange,
      true
    )

    await peerConnection.setRemoteDescription(offer)
    const sessionClientAnswer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(sessionClientAnswer)

    await fetch(`${DID_API.url}/talks/streams/${streamId}/sdp`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${DID_API.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        answer: sessionClientAnswer,
        session_id: sessionId,
      }),
    })
  })

  useEffect(() => {
    if (!initRef.current) {
      initRef.current = true
      connect.mutate()
    }
  }, [])

  return (
    <div>
      <div className="relative h-[400px] w-[400px]">
        <video
          autoPlay
          width={400}
          height={400}
          ref={videoRef}
          className="relative z-10"
        />
        <img
          src={props.avatar}
          className={cn(
            "absolute inset-0 transition-opacity",
            !ready && "opacity-50"
          )}
        />
      </div>
    </div>
  )
}
