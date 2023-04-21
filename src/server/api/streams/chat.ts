import { Configuration, OpenAIApi } from "@dqbd/openai"
import { outdent } from "outdent"
import { z } from "zod"
import { env } from "~/env.mjs"
import { streamProcedure, toAppendReadableStream } from "~/stream/stream.server"
import { getPrefixedObjects } from "~/utils/msg"
import { AgentSchema } from "~/utils/schema"




const SHORT_TERM_HISTORY_LENGTH = 15
const transformHistory = async (
  previousSummary: string | null,
  history: { role: "user" | "assistant"; content: string }[]
) => {
  const openai = new OpenAIApi(
    new Configuration({ apiKey: env.OPENAI_API_KEY })
  )

  const shortHistoryItems = history.slice(-SHORT_TERM_HISTORY_LENGTH)
  const longHistoryItems = history.slice(0, -SHORT_TERM_HISTORY_LENGTH)

  if (longHistoryItems.length === 0) {
    return { summary: null, history: shortHistoryItems }
  }

  const summaryQuery = outdent`Your goal is to summarize the contents of a conversation. ${
    previousSummary ? `The previous summary was: '${previousSummary}}'.` : ""
  } If there isn't enough context, return: The conversation has just started`

  console.log("SUMMARY QUERY", summaryQuery)

  const summary = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    stream: false,
    messages: [
      {
        role: "system",
        content: summaryQuery,
      },
      {
        role: "user",
        content: longHistoryItems.map((item) => item.content).join("\n"),
      },
    ],
  })

  const summaryText = summary.data.choices[0]?.message?.content

  return { summary: summaryText, history: shortHistoryItems }
}

export const chat = streamProcedure
  .input(
    z.object({
      history: z.array(z.string()).min(1),
      summary: z.string().nullable(),
      agents: AgentSchema,
    })
  )
  .mutation(
    async ({
      append,
      input,
    }): Promise<{ history: string[]; summary: string | null }> => {
      const openai = new OpenAIApi(
        new Configuration({ apiKey: env.OPENAI_API_KEY })
      )

      const inactiveAgents = new Set(
        input.history
          .map((i) => getPrefixedObjects(i))
          .filter((i) => i?.final != null)
          .map((i) => i?.author)
          .filter((x): x is string => x != null)
      )

      const activeAgents = input.agents.filter(
        (agent) => !inactiveAgents.has(agent.name)
      )

      const lastMeta = getPrefixedObjects(input.history.at(-1))

      const selectedIndex = Math.max(
        lastMeta
          ? activeAgents.findIndex((i) => lastMeta.target?.includes(i.name))
          : 0,
        0
      )

      const selectedAgent = activeAgents[selectedIndex]
      if (selectedAgent == null)
        return {
          summary: input.summary,
          history: input.history,
        }

      console.log("RECEIVED SUMMARY", input.summary)

      const chatHistory = [
        ...input.history
          .slice(0)
          .reverse()
          .map((msg, index) => {
            return {
              role: index % 2 === 0 ? "user" : "assistant",
              content: msg,
            } as const
          })
          .reverse(),
      ]
      const systemPrompt = input.summary
        ? ({
            role: "system",
            content: outdent`
            ${selectedAgent.system.content}

            =============

            This has been the summary of the conversation so far: ${input.summary}
        `,
          } as const)
        : selectedAgent.system

      if (chatHistory.length > SHORT_TERM_HISTORY_LENGTH + 10) {
        console.log("CREATING NEW SUMMARY")

        const { summary, history } = await transformHistory(
          input.summary,
          chatHistory
        )

        console.log("SUMMARY", summary)

        const stream = await openai.createChatCompletion({
          model: selectedAgent.model,
          stream: true,
          messages: [systemPrompt, ...history],
        })

        const newMsg = await toAppendReadableStream(stream.data, { append })

        return {
          summary: summary ?? null,
          history: [...history.map((item) => item.content), newMsg],
        }
      }
      console.log("NO SUMMARY NEEDED")

      const stream = await openai.createChatCompletion({
        model: selectedAgent.model,
        stream: true,
        messages: [systemPrompt, ...chatHistory],
      })

      const newMsg = await toAppendReadableStream(stream.data, { append })

      return {
        summary: input.summary,
        history: [...input.history, newMsg],
      }
    }
  )
