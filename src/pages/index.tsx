import { Button } from "~/components/button"
import { RouterOutputs, api, streamApi } from "~/utils/api"
import { useEffect, useRef, useState } from "react"
import { Input } from "~/components/input"
import Head from "next/head"
import { AgentType } from "~/utils/schema"
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "~/components/select"
import { SelectItem } from "~/components/select"
import { outdent } from "outdent"

import Add from "~/assets/icons/add.svg"

import { getPrefixedObjects } from "~/utils/msg"
import { cn } from "~/utils/cn"

import { createTRPCContext } from "~/server/api/trpc"
import { appRouter } from "~/server/api/root"
import { NextApiRequest, NextApiResponse } from "next"
import { useRouter } from "next/router"
import { useMutation } from "@tanstack/react-query"
import hark from "hark"

const DID_API = {
  key: "[DID_API_KEY]",
  url: "https://api.d-id.com",
} as const

const SHOW_RAW = true
function ChatMessage(props: {
  variant: "left" | "right"
  message?: string
  agents: AgentType
}) {
  const prettyPrint =
    (SHOW_RAW
      ? props.message
      : props.message
          ?.split("\n")
          .filter((i) => !i.trim().startsWith("_"))
          .join("\n")) || "..."

  const meta = getPrefixedObjects(props.message ?? "")

  const agent = props.agents.find((i) => i.name === meta?.author)

  const content = (
    <>
      <span
        className={cn(
          "max-w-[768px] whitespace-pre-wrap rounded-3xl px-4 py-3 text-white",
          agent?.colour
        )}
      >
        {prettyPrint}
      </span>
      {agent?.avatar ? (
        <img
          src={agent?.avatar ?? ""}
          alt={agent?.name}
          className="h-12 w-12 rounded-full"
        />
      ) : (
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full text-center",
            agent?.colour
          )}
        >
          <span className="text-2xl font-bold text-white">
            {agent?.name?.[0]?.toUpperCase()}
          </span>
        </div>
      )}
    </>
  )

  return (
    <div className="flex flex-col gap-4">
      {props.variant === "right" && (
        <div className={cn(`inline-flex max-w-[768px] gap-2 self-end`)}>
          {content}
        </div>
      )}
      {props.variant === "left" && (
        <div
          className={cn(
            `inline-flex max-w-[768px] flex-row-reverse gap-2 self-start`
          )}
        >
          {content}
        </div>
      )}
    </div>
  )
}

function AgentFieldGenerate(props: {
  disabled?: boolean
  onSuccess: (value: string) => void
}) {
  const [prompt, setPrompt] = useState("")
  const avatars = api.history.generateAvatar.useMutation({
    onSuccess: props.onSuccess,
  })

  return (
    <div className="flex flex-row gap-2">
      <Input
        value={prompt}
        placeholder="Avatar Prompt"
        disabled={props.disabled}
        onChange={(e) => setPrompt(e.target.value)}
      />

      <Button
        type="button"
        variant="outline"
        className="flex-shrink-0"
        disabled={props.disabled || avatars.isLoading}
        onClick={() => avatars.mutateAsync(prompt)}
      >
        Generate
      </Button>
    </div>
  )
}

function AgentEditor(props: {
  value: AgentType
  onChange: (value: AgentType) => void
  disabled?: boolean
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {props.value.map((agent, index) => {
        return (
          <div key={index} className="flex flex-col gap-2">
            <Select
              value={agent.model}
              onValueChange={(model) => {
                const value = [...props.value]
                value[index]!.model = model
                props.onChange(value)
              }}
              disabled={props.disabled}
            >
              <SelectTrigger className="w-[auto] min-w-[256px]">
                <SelectValue placeholder="Model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-3.5-turbo">gpt-3.5-turbo</SelectItem>
                <SelectItem value="gpt-4">gpt-4</SelectItem>
              </SelectContent>
            </Select>

            {agent.avatar && <img src={agent.avatar ?? ""} alt={agent.name} />}

            <Input
              value={agent.avatar}
              placeholder="Avatar"
              className="flex-grow"
              disabled={props.disabled}
              onChange={(e) => {
                const value = [...props.value]
                value[index]!.avatar = e.target.value
                props.onChange(value)
              }}
            />

            <AgentFieldGenerate
              onSuccess={(newUrl) => {
                const value = [...props.value]
                value[index]!.avatar = newUrl
                props.onChange(value)
              }}
            />

            <Input
              value={agent.name}
              placeholder="Jméno"
              disabled={props.disabled}
              onChange={(e) => {
                const value = [...props.value]
                value[index]!.name = e.target.value
                props.onChange(value)
              }}
            />

            <Input
              value={agent.colour}
              placeholder="Barva"
              disabled={props.disabled}
              onChange={(e) => {
                const value = [...props.value]
                value[index]!.colour = e.target.value
                props.onChange(value)
              }}
            />

            <Input
              value={agent.system.content}
              className="min-h-[128px]"
              disabled={props.disabled}
              onChange={(e) => {
                const value = [...props.value]
                value[index]!.system.content = e.target.value
                props.onChange(value)
              }}
            />

            <Button
              onClick={() => {
                const value = [...props.value]
                value.splice(index, 1)
                props.onChange(value)
              }}
              variant="outline"
              disabled={props.disabled}
            >
              Remove agent
            </Button>
          </div>
        )
      })}

      <div className="flex items-center justify-center">
        <Button
          onClick={() => {
            const value = [...props.value]
            value.push({
              model: "gpt-3.5-turbo",
              name: "",
              colour: "",
              system: {
                role: "system",
                content: "",
              } as const,
            })
            props.onChange(value)
          }}
          className="flex items-center gap-2"
          disabled={props.disabled}
        >
          <Add />
          Add agent
        </Button>
      </div>
    </div>
  )
}

function SummaryView(props: { summary: string | null }) {
  if (props.summary) {
    return (
      <div className="bottom-4 flex-row">
        <h3 className="text-xl font-bold">Conversation summary</h3>
        <span>{props.summary}</span>
      </div>
    )
  }

  return null
}

function Chat(props: { shared: RouterOutputs["history"]["get"] | null }) {
  const chat = streamApi.chat.useMutation({
    onSuccess: (data, variables) => {
      if (variables?.history.length !== data?.history.length) {
        onSubmit(data?.history ?? [], data?.summary ?? null)
      }
    },
  })

  const [lastHistory, setLastHistory] = useState<string[]>(
    props.shared?.history ?? []
  )
  const [lastSummary, setLastSummary] = useState<string>("")
  const [query, setQuery] = useState("")
  const router = useRouter()

  const save = api.history.save.useMutation({
    onSuccess: (item) => {
      router.push({ pathname: "/", query: { id: item.id } }, undefined, {
        shallow: true,
      })
    },
  })

  const [agents, setAgents] = useState<AgentType>(
    props.shared?.agents ?? [
      {
        model: "gpt-3.5-turbo",
        name: "A",
        colour: "bg-red-600",
        system: {
          role: "system",
          content: outdent`
          You are participant in a conversation with three AI agents, A, B, and C. 

          Before talking, you pick a different agent to whom you are talking to. You MUST follow this message format:

          =============

          _AUTHOR=A
          _TARGET=[Insert the name of next person]
          [Insert your message here]

          =============

          If you want to stop talking, use the following format instead.

          =============

          _AUTHOR=A
          _FINAL
          [Insert your message here]

          =============
          
          As Agent A, you are portraying a shy and sad teenager, so your responses should be brief and reflect this emotional state. 
        `,
        } as const,
      },
      {
        model: "gpt-3.5-turbo",
        name: "B",
        colour: "bg-blue-600",
        system: {
          role: "system",
          content: outdent`
          You are participant in a conversation with three AI agents, A, B, and C. 

          Before talking, you pick a different agent to whom you are talking to. You MUST follow this message format:

          =============

          _AUTHOR=B
          _TARGET=[Insert the name of next person]
          [Insert your message here]

          =============

          If you want to stop talking, use the following format instead.

          =============

          _AUTHOR=B
          _FINAL
          [Insert your message here]

          =============

          As Agent B, you are portraying a shy and sad teenager, so your responses should be brief and reflect this emotional state. 
        `,
        } as const,
      },
      {
        model: "gpt-3.5-turbo",
        name: "C",
        colour: "bg-green-600",
        system: {
          role: "system",
          content: outdent`
          You are participant in a conversation with three AI agents, A, B, and C. 

          Before talking, you pick a different agent to whom you are talking to. You MUST follow this message format:

          =============

          _AUTHOR=C
          _TARGET=[Insert the name of next person]
          [Insert your message here]

          =============

          If you want to stop talking, use the following format instead.

          =============

          _AUTHOR=C
          _FINAL
          [Insert your message here]

          =============

          As Agent C, you are portraying a shy and sad teenager, so your responses should be brief and reflect this emotional state. 
        `,
        } as const,
      },
    ]
  )

  async function onSubmit(newHistory: string[], summary: string | null) {
    setLastHistory(newHistory)
    if (summary) {
      setLastSummary(summary)
    }

    router.push({ pathname: "/", query: {} }, undefined, { shallow: true })

    await chat.mutation.mutateAsync({
      history: newHistory ?? [],
      summary,
      agents,
    })
  }

  return (
    <div className="flex w-full max-w-[900px] flex-col gap-4">
      <div className="flex w-full flex-col gap-4">
        {lastHistory.map((msg, index) => {
          return (
            <ChatMessage
              key={index}
              variant={index % 2 === 0 ? "right" : "left"}
              message={msg}
              agents={agents}
            />
          )
        })}
        {chat.mutation.isLoading && (
          <ChatMessage
            key="last"
            variant={lastHistory.length % 2 === 0 ? "right" : "left"}
            message={chat.partial}
            agents={agents}
          />
        )}
      </div>

      <form
        className="sticky bottom-0 flex gap-2 bg-background py-2"
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit(
            [
              [
                `_AUTHOR=${agents[0]!.name}`,
                `_TARGET=${agents[1]!.name}`,
                query,
              ].join("\n"),
            ],
            null
          )
        }}
      >
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="rounded-3xl"
        />
        <Button
          type="submit"
          className="flex-shrink-0 rounded-3xl"
          disabled={chat.mutation.isLoading}
        >
          Zeptat se
        </Button>

        {chat.mutation.isLoading ? (
          <Button
            type="button"
            className="flex-shrink-0 rounded-3xl"
            onClick={() => chat.abort()}
            disabled={!chat.mutation.isLoading}
          >
            Zastavit
          </Button>
        ) : (
          <>
            {lastHistory.length > 0 && (
              <Button
                type="button"
                className="flex-shrink-0 rounded-3xl"
                onClick={() => {
                  setLastHistory([])
                  router.push({ pathname: "/", query: {} }, undefined, {
                    shallow: true,
                  })
                  chat.mutation.reset()
                }}
              >
                Reset
              </Button>
            )}
          </>
        )}

        <Button
          type="button"
          variant="outline"
          className="flex-shrink-0 rounded-3xl"
          disabled={!lastHistory.length || save.isLoading}
          onClick={() => {
            save.mutateAsync({ history: lastHistory, agents })
          }}
        >
          Nasdílet
        </Button>
      </form>

      <SummaryView summary={lastSummary} />

      <AgentEditor
        value={agents}
        onChange={setAgents}
        disabled={chat.mutation.isLoading}
      />
    </div>
  )
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function Video() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const initRef = useRef<boolean>(false)

  const promiseRef = useRef<Promise<unknown>>(Promise.resolve())
  const sessionRef = useRef<{ streamId: string; sessionId: string } | null>(
    null
  )
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)

  const disconnect = useMutation(async () => {
    const video = videoRef.current
    if (!video) return

    if (video.srcObject && video.srcObject instanceof MediaStream) {
      video.srcObject.getTracks().forEach((track) => track.stop())
      video.srcObject = null
    }
  })

  const sendData = useMutation(async () => {
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
            input:
              "Hi, my name is Lukas. Im new GPT agent that might destroy this world.",
          },

          config: {
            fluent: "false",
            pad_audio: "0.0",
          },
          session_id: sessionRef.current.sessionId,
        }),
      }
    )

    console.log(talkResponse)
  })

  const connect = useMutation(async () => {
    if (initRef.current) return
    initRef.current = true

    const sessionResponse = await fetch(`${DID_API.url}/talks/streams`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${DID_API.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source_url: "https://d-id-public-bucket.s3.amazonaws.com/or-roman.jpg",
      }),
    })

    const {
      id: streamId,
      session_id: sessionId,
      offer,
      ice_servers: iceServers,
    } = await sessionResponse.json()

    const peerConnection = new RTCPeerConnection({ iceServers })
    peerConnection.addEventListener(
      "icecandidate",
      (event) => {
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
      },
      true
    )

    peerConnection.addEventListener(
      "iceconnectionstatechange",
      () => {
        if (peerConnection.iceConnectionState === "connected") {
          sessionRef.current = { streamId, sessionId }
        }
      },
      true
    )

    peerConnection.addEventListener(
      "track",
      (event) => {
        const video = videoRef.current
        if (!video) return

        const stream = event.streams[0]!

        video.srcObject = stream

        const speechEvents = hark(stream)

        speechEvents.on("speaking", () => {
          console.log("is speaking")
        })

        speechEvents.on("state_change", (e) => {
          console.log(e)
        })

        speechEvents.on("stopped_speaking", () => {
          console.log("stopped speaking")
        })
      },
      true
    )

    peerConnectionRef.current = peerConnection

    await peerConnectionRef.current.setRemoteDescription(offer)
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
    if (connect.isIdle) {
      connect.mutate()
    }
  }, [])

  return (
    <>
      <div className="relative">

      </div>
      <video autoPlay width={400} height={400} ref={videoRef} />
      <Button onClick={() => sendData.mutateAsync()}>Start</Button>
    </>
  )
}

export default function Page(props: {
  shared: RouterOutputs["history"]["get"]
}) {
  const [start, setState] = useState(false)
  return (
    <>
      <Head>
        <title>Conversation Test</title>
      </Head>
      <div className="mx-auto flex max-w-[1280px] flex-col gap-6 p-4">
        <div className="flex flex-col items-center">
          <Button
            onClick={() => {
              setState(true)
            }}
          >
            Start
          </Button>

          {start && (
            <>
              <Video />
              <Video />
              <Video />
            </>
          )}
          <Chat shared={props.shared} />
        </div>
      </div>
    </>
  )
}

export const getServerSideProps = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  const ctx = await createTRPCContext({ req, res })
  const caller = appRouter.createCaller(ctx)

  if (req.query.id == null) {
    return { props: { shared: null } }
  }

  const shared = await caller.history.get({ id: req.query.id as string })
  return { props: { shared } }
}
