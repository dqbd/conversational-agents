import { createTRPCRouter, publicProcedure } from "~/server/api/trpc"

import { UsersSchema, ChannelSchema } from "~/utils/schema"

export const slackRouter = createTRPCRouter({
  getMessages: publicProcedure.query(async ({ ctx }) => {
    const [chats, users] = await Promise.all([
      ctx.prisma.slack
        .findFirstOrThrow({ where: { name: "C053VFC958A.json" } })
        .then((data) => ChannelSchema.parse(JSON.parse(data.json))),
      ctx.prisma.slack
        .findFirstOrThrow({ where: { name: "users.json" } })
        .then((data) => UsersSchema.parse(JSON.parse(data.json))),
    ])

    return { chats, users }
  }),
  updateSlackMessages: publicProcedure.query(async ({ ctx }) => {
    return { result: true }
  }),
})
