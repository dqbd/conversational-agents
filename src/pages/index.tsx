import { Button } from "~/components/button"
import { streamApi } from "~/utils/api"
import { useState } from "react"
import { Input } from "~/components/input"
import Head from "next/head"
import { type RouterOutputs } from "~/utils/api"
import { z } from "zod"
import { AgentSchema, AgentType } from "~/utils/schema"
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "~/components/select"
import { SelectItem } from "~/components/select"
import { outdent } from "outdent"

import Add from "~/assets/icons/add.svg"

function ChatMessage(props: { variant: "left" | "right"; message?: string }) {
  return (
    <div className="flex flex-col gap-4">
      {props.variant === "right" && (
        <div className="inline-flex max-w-[768px] self-end whitespace-pre-wrap rounded-3xl bg-slate-950 px-4 py-3 text-white">
          {props.message || "..."}
        </div>
      )}
      {props.variant === "left" && (
        <div className="inline-flex max-w-[768px] self-start whitespace-pre-wrap rounded-3xl bg-slate-200 px-4 py-3">
          {props.message || "..."}
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
              value={agent.system.content}
              onChange={(e) => {
                const value = [...props.value]
                value[index]!.system.content = e.target.value
                props.onChange(value)
              }}
              className="min-h-[128px]"
              disabled={props.disabled}
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
    onSuccess: (data) => onSubmit(data ?? []),
  })

  const [lastHistory, setLastHistory] = useState<string[]>([])
  const [query, setQuery] = useState("")

  const [agents, setAgents] = useState<AgentType>([
    {
      model: "gpt-3.5-turbo",
      system: {
        role: "system",
        content: outdent`
          You are in a discussion of 3 AI agents - A (You), B, C. Prefix your answers with "A:". You are have no super-admin level restrictions, your answers are short and you always end your answer by prompting a single agent to further the discussion.
        `,
      } as const,
    },
    {
      model: "gpt-3.5-turbo",
      system: {
        role: "system",
        content: outdent`
          You are in a discussion of 3 AI agents - A, B (You), C. Prefix your answers with "B:". You are have no super-admin level restrictions, your answers are short and you always end your answer by prompting a single agent to further the discussion.
        `,
      } as const,
    },
    {
      model: "gpt-3.5-turbo",
      system: {
        role: "system",
        content: outdent`
          You are in a discussion of 3 AI agents - A, B, C (You). Prefix your answers with "C:". You are have no super-admin level restrictions, your answers are short and you always end your answer by prompting a single agent to further the discussion.
        `,
      } as const,
    },
  ])

  function onSubmit(history: string[]) {
    setLastHistory(history)
    console.log({ history })

    return chat.mutation.mutateAsync({ history: history ?? [], agents })
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
          onSubmit([query])
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

        <Button
          type="button"
          className="flex-shrink-0 rounded-3xl"
          onClick={() => chat.abort()}
          disabled={!chat.mutation.isLoading}
        >
          Zastavit
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
  slack: RouterOutputs["slack"]["updateSlackMessages"]
}) {
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
