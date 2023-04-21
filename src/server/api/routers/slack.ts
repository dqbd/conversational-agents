import { createTRPCRouter, publicProcedure } from "~/server/api/trpc"

import { execa } from "execa"
import path from "path"
import os, { tmpdir } from "os"
import fs from "fs/promises"
import { UsersSchema, ChannelSchema } from "~/utils/schema"
import { env } from "~/env.mjs"

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
    const execPath = path.resolve(
      process.cwd(),
      `bin/slackdump_${process.platform}_${process.arch}`
    )

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "slackdump-"))

    const usersPath = path.resolve(tmpDir, "users.json")
    const channelPath = path.resolve(tmpDir, "C053VFC958A.json")

    await Promise.all([
      execa(
        execPath,
        [
          "-user-cache-age",
          "0",
          "-r",
          "json",
          "-u",
          "-o",
          usersPath,
          "C053VFC958A",
        ],
        {
          env: {
            NODE_ENV: env.NODE_ENV,
            SLACK_TOKEN: env.SLACK_TOKEN,
            COOKIE: env.COOKIE,
          },
          stdout: "inherit",
          stderr: "inherit",
        }
      ),
      execa(
        execPath,
        ["-user-cache-age", "0", "-base", tmpDir, "C053VFC958A"],
        {
          env: {
            NODE_ENV: env.NODE_ENV,
            SLACK_TOKEN: env.SLACK_TOKEN,
            COOKIE: env.COOKIE,
          },
          stdout: "inherit",
          stderr: "inherit",
        }
      ),
    ])

    const [usersJson, channelsJson] = await Promise.all([
      fs.readFile(usersPath, { encoding: "utf-8" }),
      fs.readFile(channelPath, { encoding: "utf-8" }),
    ])

    UsersSchema.parse(JSON.parse(usersJson))
    ChannelSchema.parse(JSON.parse(channelsJson))

    const result = await ctx.prisma.$transaction(async (tx) => {
      const users = UsersSchema.parse(
        JSON.parse(
          (
            await tx.slack.upsert({
              where: { name: "users.json" },
              update: { json: usersJson },
              create: { name: "users.json", json: usersJson },
            })
          ).json
        )
      )

      const channels = ChannelSchema.parse(
        JSON.parse(
          (
            await tx.slack.upsert({
              where: { name: "C053VFC958A.json" },
              update: { json: channelsJson },
              create: { name: "C053VFC958A.json", json: channelsJson },
            })
          ).json
        )
      )

      return { users, channels }
    })

    await fs.rm(tmpDir, { recursive: true, force: true })
    return result
  }),
})
