import { Button } from "~/components/button"
import { api, streamApi } from "~/utils/api"
import { escapeForSlackWithMarkdown } from "slack-to-html"
import { useEffect, useState } from "react"
import { Input } from "~/components/input"
import Head from "next/head"
import { NextApiRequest, NextApiResponse } from "next"
import { createTRPCContext } from "~/server/api/trpc"
import { appRouter } from "~/server/api/root"
import { type RouterOutputs } from "~/utils/api"
import { Switch } from "~/components/switch"
import { Label } from "~/components/label"
import { cn } from "~/utils/cn"

type ApiResult = {
  mutation: {
    variables?: { query: string }
    data?: string
  }
  partial?: string
}

function ChatDialog(props: { api: ApiResult }) {
  const content = props.api.mutation.data || props.api.partial
  return (
    <div className="flex flex-col gap-4">
      <div className="inline-flex max-w-[768px] self-end whitespace-pre-wrap rounded-3xl bg-slate-950 px-4 py-3 text-white">
        {props.api.mutation.variables?.query}
      </div>
      <div className="inline-flex max-w-[768px] self-start whitespace-pre-wrap rounded-3xl bg-slate-200 px-4 py-3">
        {content ? <>{content}</> : <span>...</span>}
      </div>
    </div>
  )
}

function Chat() {
  const api = streamApi.chat.useMutation()
  const [query, setQuery] = useState("")

  const [history, setHistory] = useState<ApiResult[]>([])

  function onSearch(query: string) {
    if (query == "") return
    let newHistory = history
    if (api.mutation.variables?.query && api.mutation.data) {
      newHistory = [
        ...history,
        {
          mutation: {
            variables: api.mutation.variables,
            data: api.mutation.data,
          },
          partial: api.partial,
        },
      ]
      setHistory(newHistory)
    }

    setQuery("")
    return api.mutation.mutateAsync({
      query,
      history: newHistory.map((a) => ({
        answer: (a.mutation.data || a.partial) ?? "",
        question: a.mutation.variables?.query ?? "",
      })),
    })
  }

  useEffect(() => {
    function listener(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        onSearch(query)
      }
    }

    window.addEventListener("keydown", listener)

    return () => window.removeEventListener("keydown", listener)
  }, [query])

  return (
    <div className="flex w-full max-w-[900px] flex-col gap-4">
      <div className="flex w-full flex-col gap-4">
        {history.map((api, i) => (
          <ChatDialog key={i} api={api} />
        ))}

        {!api.mutation.isIdle && <ChatDialog api={api} />}
      </div>

      <form
        className="sticky bottom-0 flex gap-2 bg-background py-2"
        onSubmit={(e) => {
          e.preventDefault()
          onSearch(query)
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
          disabled={api.mutation.isLoading}
        >
          Zeptat se
        </Button>
      </form>
    </div>
  )
}

function Person(props: {
  image?: string
  name: string
  content: string
  chatMsgId: string
  onlySummary?: boolean
  users: Record<string, string>
}) {
  const summary = api.summary.get.useQuery(
    { client_msg_id: props.chatMsgId },
    { staleTime: Infinity }
  )
  const newSummary = streamApi.summary.useMutation()

  const html = escapeForSlackWithMarkdown(props.content, {
    users: props.users,
  })

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-4">
      <div className="flex items-center gap-2">
        <img
          src={props.image}
          className="h-8 w-8 rounded-full"
          alt={props.name}
        />
        <strong className="font-bold">{props.name}</strong>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <span
          className={cn(
            "whitespace-pre-wrap break-words lg:break-before-auto",
            props.onlySummary && "hidden lg:block"
          )}
          dangerouslySetInnerHTML={{ __html: html }}
        />
        <div className="flex flex-col gap-2">
          <span className="whitespace-pre-wrap font-mono">
            {newSummary.mutation.isIdle
              ? summary.data?.summary
              : newSummary.partial || newSummary.mutation.data}
          </span>
          <Button
            variant="outline"
            onClick={() =>
              newSummary.mutation.mutateAsync({
                client_msg_id: props.chatMsgId,
              })
            }
            disabled={newSummary.mutation.isLoading}
          >
            Sumarizovat
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function Page(props: {
  slack: RouterOutputs["slack"]["updateSlackMessages"]
}) {
  const users = props.slack.users.reduce<Record<string, string>>(
    (memo, item) => {
      memo[item.id] = item.real_name
      return memo
    },
    {}
  )

  const [onlySummary, setOnlySummary] = useState(false)

  return (
    <>
      <Head>
        <title>Prague AI Hackathon #intro</title>
      </Head>
      <div className="mx-auto flex max-w-[1280px] flex-col gap-6 p-4">
        <div className="flex min-h-[80vh] flex-col items-center justify-center gap-4 lg:gap-6">
          <h1 className="text-center text-2xl font-bold lg:text-5xl">
            🤖 Prague AI Hackathon #intro
          </h1>

          <Chat />
        </div>

        <div className="flex flex-col">
          <div className="sticky top-0 flex items-center gap-2 bg-background py-4 lg:hidden">
            <Switch
              id="summary"
              checked={onlySummary}
              onCheckedChange={() => setOnlySummary((value) => !value)}
            />
            <Label htmlFor="summary">Pouze v odrážkách</Label>
          </div>

          <div className="flex flex-col gap-4">
            {props.slack.channels.messages
              .slice(0)
              .reverse()
              .map((msg, idx) => {
                if (!("client_msg_id" in msg) || msg.client_msg_id == null) {
                  return null
                }

                const user = props.slack.users.find((u) => u.id === msg.user)
                return (
                  <div key={msg.client_msg_id}>
                    <Person
                      onlySummary={onlySummary}
                      image={user?.profile?.image_512}
                      chatMsgId={msg.client_msg_id}
                      content={msg.text}
                      name={user?.real_name || msg.user}
                      users={users}
                    />
                  </div>
                )
              })}
          </div>
        </div>
      </div>
    </>
  )
}

export const getStaticProps = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  const ctx = await createTRPCContext({ req, res })
  const caller = appRouter.createCaller(ctx)

  const slack = await caller.slack.updateSlackMessages()

  return {
    props: { slack },
    revalidate: 120,
  }
}
