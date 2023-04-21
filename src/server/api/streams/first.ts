import { streamProcedure, toAppendReadableStream } from "~/stream/stream.server"
import { z } from "zod"
import { Configuration, OpenAIApi } from "@dqbd/openai"
import { env } from "~/env.mjs"
import { outdent } from "outdent"

import { prisma } from "~/server/db"

export const first = streamProcedure
  .input(
    z.object({
      query: z.string(),
      history: z.array(z.string()),
    })
  )
  .mutation(async ({ append, input }) => {
    const openai = new OpenAIApi(
      new Configuration({ apiKey: env.OPENAI_API_KEY })
    )

    const stream = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      stream: true,
      messages: [
        {
          role: "system",
          content: outdent`
            Přelož mi zprávu do angličtiny
          `,
        },
        ...input.history.map(
          (item, index) =>
            ({
              role: index % 2 === 0 ? "user" : "assistant",
              content: item,
            } as const)
        ),
        { role: "user", content: input.query },
      ],
    })
    return await toAppendReadableStream(stream.data, { append })
  })
