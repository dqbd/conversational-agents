import { Button } from "~/components/button"
import { RouterOutputs, api, streamApi } from "~/utils/api"
import { useState } from "react"
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
import {
  InferGetServerSidePropsType,
  NextApiRequest,
  NextApiResponse,
} from "next"
import { useRouter } from "next/router"

const COLORS = [
  "bg-red-600",
  "bg-blue-600",
  "bg-green-600",
  "bg-yellow-600",
  "bg-purple-600",
  "bg-pink-600",
  "bg-indigo-600",
  "bg-teal-600",
  "bg-orange-600",
  "bg-gray-600",
  "bg-slate-600",
  "bg-slate-200",
  "bg-slate-950",
]

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
          Object.fromEntries(COLORS.map((i) => [i, false])),
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

function AgentEditor(props: {
  value: AgentType
  onChange: (value: AgentType) => void
  disabled?: boolean
}) {
  const avatars = api.history.generateAvatar.useMutation({})

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
              disabled={props.disabled}
              onChange={(e) => {
                const value = [...props.value]
                value[index]!.avatar = e.target.value
                props.onChange(value)
              }}
            />

            <Button
              type="button"
              onClick={() => {
                avatars.mutateAsync(agent.name).then((url) => {
                  const value = [...props.value]
                  value[index]!.avatar = url
                  props.onChange(value)
                })
              }}
            >
              Generate avatar
            </Button>

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

function Chat(props: { serverHistory: string[] | null | undefined }) {
  const chat = streamApi.chat.useMutation({
    onSuccess: (data, variables) => {
      if (variables?.history.length !== data?.history.length) {
        onSubmit(data?.history ?? [], data?.summary ?? null)
      }
    },
  })

  const [lastHistory, setLastHistory] = useState<string[]>(
    props.serverHistory ?? []
  )
  const [query, setQuery] = useState("")
  const router = useRouter()

  const save = api.history.save.useMutation({
    onSuccess: (item) => {
      router.push({ pathname: "/", query: { id: item.id } }, undefined, {
        shallow: true,
      })
    },
  })

  const [agents, setAgents] = useState<AgentType>([
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
  ])

  async function onSubmit(newHistory: string[], summary: string | null) {
    setLastHistory(newHistory)
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
            save.mutateAsync({ history: lastHistory })
          }}
        >
          Nasdílet
        </Button>
      </form>

      <AgentEditor
        value={agents}
        onChange={setAgents}
        disabled={chat.mutation.isLoading}
      />
    </div>
  )
}

export default function Page(props: {
  history: RouterOutputs["history"]["get"]
}) {
  return (
    <>
      <Head>
        <title>Conversation Test</title>
      </Head>
      <div className="mx-auto flex max-w-[1280px] flex-col gap-6 p-4">
        <div className="flex flex-col items-center">
          <Chat serverHistory={props.history} />
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
    return { props: { history: [] } }
  }

  const history = await caller.history.get({ id: req.query.id as string })

  return { props: { history } }
}
