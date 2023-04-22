import { Configuration, OpenAIApi } from "@dqbd/openai"
import { z } from "zod"
import { env } from "~/env.mjs"
import { streamProcedure, toAppendReadableStream } from "~/stream/stream.server"
import { getPrefixedObjects } from "~/utils/msg"
import { AgentSchema } from "~/utils/schema"




export const chat = streamProcedure
  .input(z.object({ history: z.array(z.string()).min(1), agents: AgentSchema }))
  .mutation(async ({ append, input }) => {
    const openai = new OpenAIApi(
      new Configuration({ apiKey: env.OPENAI_API_KEY })
    )

    const inactiveAgents = new Set(
      input.history
        .map((i) => getPrefixedObjects(i))
        .filter((i) => i?.final != null)
        .map((i) => i?.author)
        .filter((x): x is string => x != null)
    )

    const activeAgents = input.agents.filter(
      (agent) => !inactiveAgents.has(agent.name)
    )

    const lastMeta = getPrefixedObjects(input.history.at(-1))

    const selectedIndex = Math.max(
      lastMeta
        ? activeAgents.findIndex((i) => lastMeta.target?.includes(i.name))
        : 0,
      0
    )

    const selectedAgent = activeAgents[selectedIndex]

    if (selectedAgent == null) return input.history
    const stream = await openai.createChatCompletion({
      model: selectedAgent.model,
      stream: true,
      messages: [
        selectedAgent.system,
        ...input.history
          .slice(0)
          .reverse()
          .map((msg, index) => {
            return {
              role: index % 2 === 0 ? "user" : "assistant",
              content: msg,
            } as const
          })
          .reverse(),
      ],
    })

    const newMsg = await toAppendReadableStream(stream.data, { append })

    return [...input.history, newMsg]
  })
