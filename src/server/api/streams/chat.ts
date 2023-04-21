import { Configuration, OpenAIApi } from "@dqbd/openai"
import { outdent } from "outdent"
import { z } from "zod"
import { env } from "~/env.mjs"
import { streamProcedure, toAppendReadableStream } from "~/stream/stream.server"

export const chat = streamProcedure
  .input(z.object({ history: z.array(z.string()).min(1) }))
  .mutation(async ({ append, input }) => {
    const openai = new OpenAIApi(
      new Configuration({ apiKey: env.OPENAI_API_KEY })
    )

    const agents = [
      {
        model: "gpt-3.5-turbo",
        system: {
          role: "system",
          content: outdent`
            You are a happy agent, answering in a single sentence.
          `,
        } as const,
      },
      {
        model: "gpt-3.5-turbo",
        system: {
          role: "system",
          content: outdent`
            You are a grumpy agent, answering in a single sentence.
          `,  
        } as const,
      },
    ]

    const chatOrder = (input.history.length - 1) % 2

    const selectedAgent = agents[chatOrder]!
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
