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
    ]

    const selectedAgent = agents[(input.history.length - 1) % agents.length]!
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
