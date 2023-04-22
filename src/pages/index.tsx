import { Button } from "~/components/button"
import { streamApi } from "~/utils/api"
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

const SHOW_RAW = true
function ChatMessage(props: { variant: "left" | "right"; message?: string }) {
  const prettyPrint =
    (SHOW_RAW
      ? props.message
      : props.message
          ?.split("\n")
          .filter((i) => !i.trim().startsWith("_"))
          .join("\n")) || "..."

  return (
    <div className="flex flex-col gap-4">
      {props.variant === "right" && (
        <div className="inline-flex max-w-[768px] self-end whitespace-pre-wrap rounded-3xl bg-slate-950 px-4 py-3 text-white">
          {prettyPrint}
        </div>
      )}
      {props.variant === "left" && (
        <div className="inline-flex max-w-[768px] self-start whitespace-pre-wrap rounded-3xl bg-slate-200 px-4 py-3">
          {prettyPrint}
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

            <Input
              value={agent.name}
              disabled={props.disabled}
              onChange={(e) => {
                const value = [...props.value]
                value[index]!.name = e.target.value
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

function Chat() {
  const chat = streamApi.chat.useMutation({
    onSuccess: (data, variables) => {
      if (variables?.history.length !== data?.length) {
        onSubmit(data ?? [])
      }
    },
  })

  const [lastHistory, setLastHistory] = useState<string[]>([])
  const [query, setQuery] = useState("")

  const [agents, setAgents] = useState<AgentType>([
    {
      model: "gpt-3.5-turbo",
      name: "A",
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

  async function onSubmit(newHistory: string[]) {
    setLastHistory(newHistory)
    console.log({ history: newHistory })

    const newMessages = await chat.mutation.mutateAsync({
      history: newHistory ?? [],
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
            />
          )
        })}
        {chat.mutation.isLoading && (
          <ChatMessage
            key="last"
            variant={lastHistory.length % 2 === 0 ? "right" : "left"}
            message={chat.partial}
          />
        )}
      </div>

      <form
        className="sticky bottom-0 flex gap-2 bg-background py-2"
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit([
            [
              `_AUTHOR=${agents[0]!.name}`,
              `_TARGET=${agents[1]!.name}`,
              query,
            ].join("\n"),
          ])
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
                  chat.mutation.reset()
                }}
              >
                Reset
              </Button>
            )}
          </>
        )}
      </form>

      <AgentEditor
        value={agents}
        onChange={setAgents}
        disabled={chat.mutation.isLoading}
      />
    </div>
  )
}

export default function Page() {
  return (
    <>
      <Head>
        <title>Conversation Test</title>
      </Head>
      <div className="mx-auto flex max-w-[1280px] flex-col gap-6 p-4">
        <div className="flex flex-col items-center">
          <Chat />
        </div>
      </div>
    </>
  )
}
