import { streamProcedure, toAppendReadableStream } from "~/stream/stream.server"
import { z } from "zod"
import { Configuration, OpenAIApi } from "@dqbd/openai"
import { env } from "~/env.mjs"
import { outdent } from "outdent"
import { prisma } from "~/server/db"
import { ChannelSchema, UsersSchema } from "~/utils/schema"
import { escapeForSlackWithMarkdown } from "slack-to-html"

export const summaryStream = streamProcedure
  .input(z.object({ client_msg_id: z.string() }))
  .mutation(async ({ append, input }) => {
    const openai = new OpenAIApi(
      new Configuration({ apiKey: env.OPENAI_API_KEY })
    )

    const [chats, users] = await Promise.all([
      prisma.slack
        .findFirstOrThrow({ where: { name: "C053VFC958A.json" } })
        .then((data) => ChannelSchema.parse(JSON.parse(data.json))),
      prisma.slack
        .findFirstOrThrow({ where: { name: "users.json" } })
        .then((data) => UsersSchema.parse(JSON.parse(data.json))),
    ])

    const msg = chats.messages.find(
      (msg) => msg.client_msg_id === input.client_msg_id
    )

    const msgId = msg?.client_msg_id
    const user = users.find((user) => user.id === msg?.user)

    const userId = user?.id
    const name = user?.real_name

    if (name == null || msg == null || userId == null || msgId == null) {
      throw new Error("Failed to find user or message")
    }

    const content = escapeForSlackWithMarkdown(msg?.text ?? "", {
      users: users.reduce<Record<string, string>>((memo, user) => {
        memo[user.id] = user.real_name
        return memo
      }, {}),
    })

    const completion = await openai.createChatCompletion({
      model: "gpt-4",
      stream: true,
      messages: [
        {
          role: "system",
          content: outdent`
            Write a short description from the introduction post. Use markdown and at most 5 bullet points. Keep it short. If the bullet point is an idea for a project, mark it bold. Translate into Czech.

            Example output:
            - Developer in a company
            - Experience in programming
            - **CzechGPT**: a GPT that likes to drink beer all the time
          `,
        },
        { role: "user", content },
      ],
    })

    const summary = await toAppendReadableStream(completion.data, { append })

    await prisma.profile.upsert({
      where: { id: userId },
      update: { name, summary, msgId },
      create: { id: userId, name, summary, msgId },
    })

    return summary
  })
