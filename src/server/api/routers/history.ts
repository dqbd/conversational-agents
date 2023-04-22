import { z } from "zod"
import { createTRPCRouter, publicProcedure } from "../trpc"

export const history = createTRPCRouter({
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const item = await ctx.prisma.history.findFirst({
        where: { id: input.id },
      })
      return z.array(z.string()).nullish().parse(JSON.parse(item?.historyJson ?? ""))
    }),
  save: publicProcedure
    .input(z.object({ history: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.history.create({
        data: { historyJson: JSON.stringify(input.history) },
      })
    }),
})
