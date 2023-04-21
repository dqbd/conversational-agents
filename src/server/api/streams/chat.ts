import { Configuration, OpenAIApi } from "@dqbd/openai"
import { outdent } from "outdent"
import { z } from "zod"
import { env } from "~/env.mjs"
import { streamProcedure, toAppendReadableStream } from "~/stream/stream.server"
import { AgentSchema } from "~/utils/schema"

export const chat = streamProcedure
  .input(z.object({ history: z.array(z.string()).min(1), agents: AgentSchema }))
  .mutation(async ({ append, input }) => {
    const openai = new OpenAIApi(
      new Configuration({ apiKey: env.OPENAI_API_KEY })
    )

    const agents = input.agents

    const lastModel =
      input.history
        .slice(1)
        .at(-1)
        ?.split("<|prompt|>")
        .at(-1)
        ?.trim()
        .replaceAll("(", "")
        .replaceAll(")", "") ?? "A"

    const index = ["A", "B", "C", "D"].indexOf(lastModel.toUpperCase())

    const selectedAgent = agents[index]!
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
