import { z } from "zod"

export const AgentSchema = z.array(
  z.object({
    model: z.string(),
    name: z.string(),
    colour: z.string(),
    system: z.object({
      role: z.literal("system"),
      content: z.string(),
    }),
  })
)

export type AgentType = z.infer<typeof AgentSchema>
