import { z } from "zod"
import { createTRPCRouter, publicProcedure } from "../trpc"

export const summaryRouter = createTRPCRouter({
  get: publicProcedure
    .input(z.object({ client_msg_id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.profile.findFirst({
        where: { msgId: input.client_msg_id },
      })
    }),
})
