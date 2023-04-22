import { createTRPCRouter } from "~/server/api/trpc"
import { history } from "~/server/api/routers/history"

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  history,
})

// export type definition of API
export type AppRouter = typeof appRouter
