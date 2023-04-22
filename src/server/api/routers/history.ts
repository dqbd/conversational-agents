import { z } from "zod"
import { createTRPCRouter, publicProcedure } from "../trpc"

import { createClient } from "@supabase/supabase-js"
import Replicate from "replicate"
import { OpenAIApi, Configuration } from "@dqbd/openai"
import path from "path"
import { env } from "~/env.mjs"
import { v4 as uuid } from "uuid"

export const history = createTRPCRouter({
  generateAvatar: publicProcedure
    .input(z.string())
    .mutation(async ({ input }) => {
      const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_API_KEY)
      const replicate = new Replicate({
        auth: env.REPLICATE_API_KEY,
      })

      const openai = new OpenAIApi(
        new Configuration({ apiKey: env.OPENAI_API_KEY })
      )

      const output = z
        .array(z.string())
        .min(1)
        .parse(
          await replicate.run(
            "stability-ai/stable-diffusion:db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5bf",
            { input: { prompt: input } }
          )
        )

      const url = output[0]!
      const filename = uuid() + path.extname(url)

      const arrayBuffer = await fetch(url).then((a) => a.arrayBuffer())

      const { data, error } = await supabase.storage
        .from("avatars")
        .upload(filename, arrayBuffer, { upsert: true })

      if (error) throw error

      return new URL(
        `/storage/v1/object/public/avatars/${data.path}`,
        env.SUPABASE_URL
      ).toString()
    }),
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const item = await ctx.prisma.history.findFirst({
        where: { id: input.id },
      })
      return z
        .array(z.string())
        .nullish()
        .parse(JSON.parse(item?.historyJson ?? ""))
    }),
  save: publicProcedure
    .input(z.object({ history: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.history.create({
        data: { historyJson: JSON.stringify(input.history) },
      })
    }),
})
