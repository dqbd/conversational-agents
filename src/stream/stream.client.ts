import {
  type MutationOptions,
  useMutation,
  type UseMutationResult,
} from "@tanstack/react-query"
import { useState } from "react"
import type { StreamRouterType } from "./stream.types"

import superjson from "superjson"

interface StreamMutationResult<Input, Response> {
  mutation: UseMutationResult<Response | undefined, unknown, Input, unknown>
  partial: string
}

type StreamRouterClient<StreamRouter extends StreamRouterType> = {
  [K in keyof StreamRouter]: {
    useMutation: (
      options?: MutationOptions<
        Awaited<StreamRouter[K]["response"]> | undefined,
        unknown,
        Awaited<StreamRouter[K]["input"]>,
        unknown
      >
    ) => StreamMutationResult<
      Awaited<StreamRouter[K]["input"]>,
      Awaited<StreamRouter[K]["response"]>
    >
  }
}

function useStreamMutation<Input, Response>(
  path: string,
  options?: MutationOptions<Response | undefined, unknown, Input, unknown>
): StreamMutationResult<Input, Response> {
  const [partial, setPartial] = useState("")
  const mutation = useMutation(async (input: Input) => {
    setPartial("")

    const response = await fetch(`/api/stream/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })

    if (!response.ok) throw new Error(response.statusText)
    const data = response.body
    if (!data) return

    const reader = data.getReader()
    const decoder = new TextDecoder()
    let done = false

    let content = ""

    while (!done) {
      const { value, done: doneReading } = await reader.read()
      const chunkValue = decoder.decode(value)

      content += chunkValue
      if (!content.includes("[END]")) {
        setPartial(content)
      }

      done = doneReading
    }

    const [, sourceStr] = content.split("[END]")
    if (!sourceStr) throw new Error("Missing [END] splitter")
    return superjson.parse(sourceStr) as Response
  }, options)

  return { mutation, partial }
}

type ProxyCallback = (opts: { path: string[]; args: unknown[] }) => unknown
function createProxy<Result>(callback: ProxyCallback, path: string[]): Result {
  return new Proxy(() => {}, {
    get(_obj, key) {
      if (typeof key !== "string") return undefined
      return createProxy(callback, [...path, key])
    },
    apply(_target, _thisArg, args) {
      return callback({ args, path })
    },
  }) as unknown as Result
}

export function createStreamClient<StreamRouter extends StreamRouterType>() {
  return createProxy<StreamRouterClient<StreamRouter>>((opts) => {
    const [path, method] = opts.path

    if (method !== "useMutation") throw new Error("Invalid method")
    const args = opts.args as any[]
    return useStreamMutation(path!, ...args)
  }, [])
}
