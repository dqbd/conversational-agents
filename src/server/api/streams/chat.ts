import { streamProcedure, toAppendReadableStream } from "~/stream/stream.server"
import { z } from "zod"
import { Configuration, OpenAIApi } from "@dqbd/openai"
import { env } from "~/env.mjs"
import { outdent } from "outdent"

import { prisma } from "~/server/db"

export const chatStream = streamProcedure
  .input(
    z.object({
      query: z.string(),
      history: z.array(
        z.object({
          question: z.string(),
          answer: z.string(),
        })
      ),
    })
  )
  .mutation(async ({ append, input }) => {
    const openai = new OpenAIApi(
      new Configuration({ apiKey: env.OPENAI_API_KEY })
    )

    const profiles = await prisma.profile.findMany({
      select: { name: true, summary: true },
    })

    const stream = await openai.createChatCompletion({
      model: "gpt-4",
      stream: true,
      messages: [
        {
          role: "system",
          content: [
            outdent`
              Jsi AI organizátor hackathonu v Praze, který rád odpovídá věcně, stručně ale přátelsky.

              Datum: 21.-22. dubna 2023
              Místo: Cleevio 5.p, Mississipi house, Karolinská 706/3, 186 00 Karlín
              Kapacita akce: 70 účastníků
              Organizátoři:
               - Jan Antonin Kolar (spoluautor aplikace copyhat.com, coufounder rc.xyz)
               - Petr Brzek (spoluzakladatel Avocode)
               - Pavel Kral (vývojář v Rossumu)
               - David Šiška (ex-CEO Bonami, spoluzakladatel Czech Founders)

              Tvým cílem je poradit účastníkům, jaké členy ještě potřebuje do týmu. 
              
              Pouze tyto účastníci jsou na tomto hackatonu:
            `,
            profiles.map((i) => `- ${i.name}`).join("\n"),
            outdent`
              Pokud jsi nejsi jist, napiš: "Netuším odpovědět"
            `,
            ...profiles.map(
              (profile) => outdent`
              # ${profile.name}
              ${profile.summary}
            `
            ),
          ].join("\n\n"),
        },
        ...input.history.reduce<
          Array<{ role: "user" | "assistant"; content: string }>
        >((memo, item) => {
          memo.push({ content: item.question, role: "user" })
          memo.push({ content: item.answer, role: "assistant" })
          return memo
        }, []),
        { role: "user", content: input.query },
      ],
    })

    return await toAppendReadableStream(stream.data, { append })
  })
