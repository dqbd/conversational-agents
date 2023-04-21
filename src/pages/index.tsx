import { Button } from "~/components/button"
import { streamApi } from "~/utils/api"
import { useState } from "react"
import { Input } from "~/components/input"
import Head from "next/head"
import { type RouterOutputs } from "~/utils/api"

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

function Chat() {
  const chat = streamApi.chat.useMutation({
    onSuccess: (data) => onSubmit(data ?? []),
  })

  const [lastHistory, setLastHistory] = useState<string[]>([])
  const [query, setQuery] = useState("")

  function onSubmit(history: string[]) {
    setLastHistory(history)
    console.log({ history })

    return chat.mutation.mutateAsync({ history: history ?? [] })
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
        <div className="flex min-h-[80vh] flex-col items-center justify-center gap-4 lg:gap-6">
          <Chat />
        </div>
      </div>
    </>
  )
}
