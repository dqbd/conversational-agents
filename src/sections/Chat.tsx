import { Button } from "~/components/button"
import { RouterOutputs, api, streamApi } from "~/utils/api"
import { useRef, useState } from "react"
import { Input } from "~/components/input"
import { AgentType } from "~/utils/schema"
import { outdent } from "outdent"
import { getPrefixedObjects } from "~/utils/msg"
import { cn } from "~/utils/cn"
import { useRouter } from "next/router"
import { Video } from "./Video"
import { Switch } from "~/components/switch"
import { Label } from "@radix-ui/react-label"
import { ChatMessage } from "./ChatMessage"
import { AgentEditor } from "./AgentEditor"
import { SummaryView } from "./SummaryView"

export function Chat(props: {
  shared: RouterOutputs["history"]["get"] | null
}) {
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
        avatar: "http://other.vucek.com/person_1.png",
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
        avatar: "http://other.vucek.com/person_2.png",
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
        avatar: "http://other.vucek.com/person_3.png",
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

  const [videoMode, setVideoMode] = useState(false)
  const [demoMode, setDemoMode] = useState(false)
  const videoSendRef = useRef<Record<string, (content: string) => void>>({})
  async function onSubmit(newHistory: string[], summary: string | null) {
    setLastHistory(newHistory)
    if (summary) {
      setLastSummary(summary)
    }

    router.push({ pathname: "/", query: {} }, undefined, { shallow: true })

    const lastMessage = newHistory.at(-1)
    if (lastMessage && videoMode) {
      const textContents = lastMessage
        ?.split("\n")
        .filter((i) => !i.trim().startsWith("_"))
        .join("\n")

      const meta = getPrefixedObjects(lastMessage)
      const agent = agents.findIndex((i) => i.name === meta?.author)

      if (textContents.trim().length > 0 && agent >= 0) {
        const send = videoSendRef.current[agents[agent]?.name ?? ""]
        if (send != null) {
          await send(textContents)
        } else {
          console.log("send is null")
        }
      }

      if (!demoMode && newHistory.length > 4) return
    }

    await chat.mutation.mutateAsync({
      history: newHistory ?? [],
      summary,
      agents,
    })
  }

  return (
    <>
      <div className={cn("flex", !videoMode && "hidden")}>
        {agents.map((agent) => (
          <Video
            key={agent.name}
            name={agent.name}
            avatar={
              agent.avatar ??
              "https://d-id-public-bucket.s3.amazonaws.com/or-roman.jpg"
            }
            onReady={(cb) => {
              videoSendRef.current[agent.name] = cb
            }}
          />
        ))}
      </div>

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

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Switch
              id="video"
              checked={videoMode}
              onCheckedChange={() => setVideoMode((value) => !value)}
            />
            <Label htmlFor="video">Video Mode</Label>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="demo"
              checked={demoMode}
              onCheckedChange={() => setDemoMode((value) => !value)}
            />
            <Label htmlFor="demo">Continuous Mode</Label>
          </div>
        </div>

        <SummaryView summary={lastSummary} />

        <AgentEditor
          value={agents}
          onChange={setAgents}
          disabled={chat.mutation.isLoading}
        />
      </div>
    </>
  )
}
