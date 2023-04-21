import { createTRPCRouter } from "~/server/api/trpc"
import { summaryRouter } from "~/server/api/routers/summary"

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  summary: summaryRouter,
})

// export type definition of API
export type AppRouter = typeof appRouter
