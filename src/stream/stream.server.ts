import superjson from "superjson"
import { type NextApiRequest, type NextApiResponse } from "next"
import { z } from "zod"
import { type StreamProcedure } from "./stream.types"
import { createParser } from "eventsource-parser"

interface StreamResolver<Input, Response> {
  (handler: { input: Input; append: (data: string) => void }): Response
}

class StreamProcedureBuilder<
  Input extends z.Schema | undefined = undefined,
  Parameters = unknown
> {
  schema: z.Schema | undefined

  constructor(schema?: Input) {
    this.schema = schema
  }

  input<TInput extends z.Schema>(
    schema: TInput
  ): StreamProcedureBuilder<z.infer<TInput>, Parameters> {
    return new StreamProcedureBuilder(schema)
  }

  mutation<TResponse>(
    resolver: StreamResolver<Input, TResponse>
  ): StreamProcedure<Input, TResponse> {
    return {
      handler: async (req, res) => {
        console.log(req.body, this.schema?.parse(req.body))
        try {
          const data = await resolver({
            input: this.schema?.parse(req.body),
            append: (token) => res.write(token),
          })

          res.write("[END]")
          res.write(superjson.stringify(data))
        } finally {
          res.end()
        }
      },
      edgeHandler: async (req) => {
        const encoder = new TextEncoder()
        const schema = this.schema

        const stream = new ReadableStream({
          async start(controller) {
            try {
              const data = await resolver({
                input: schema?.parse(await req.json()),
                append: (token) => controller.enqueue(encoder.encode(token)),
              })

              controller.enqueue(encoder.encode("[END]"))
              controller.enqueue(encoder.encode(superjson.stringify(data)))
            } catch (e) {
              console.log(e)
            } finally {
              controller.close()
            }
          },
        })

        return new Response(stream)
      },
    }
  }
}

export const toAppendReadableStream = async (
  stream: ReadableStream,
  args: {
    append: (data: string) => void
  }
) => {
  const decoder = new TextDecoder()
  return await new Promise<string>(async (resolve) => {
    let innerResponse = ""
    const parser = createParser((event) => {
      if (event.type === "event") {
        if (event.data === "[DONE]") return resolve(innerResponse)
        const response = JSON.parse(event.data) as {
          id: string
          object: string
          created: number
          model: string
          choices: {
            delta: { content?: string }
            index: number
            finish_reason?: string
          }[]
        }

        if (response.choices[0]?.delta?.content != null) {
          innerResponse += response.choices[0]?.delta?.content
          args.append(response.choices[0]?.delta?.content)
        }
      }
    })

    for await (const chunk of stream as any) {
      parser.feed(decoder.decode(chunk))
    }
  })
}

export const streamProcedure = new StreamProcedureBuilder()

export function createStreamHandler<
  TRouter extends Record<string, StreamProcedure<unknown, unknown>>
>(params: { router: TRouter }) {
  async function handler(
    req: NextApiRequest,
    res: NextApiResponse
  ): Promise<void>
  async function handler(req: Request): Promise<Response | undefined>

  async function handler(req: NextApiRequest | Request, res?: NextApiResponse) {
    if (req instanceof Request) {
      const query = new URL(req.url).searchParams.get("stream")
      return await params.router[query!]?.edgeHandler(req)
    }

    if (res != null) {
      const query = z.object({ stream: z.string() }).parse(req.query)
      return await params.router[query.stream]?.handler(req, res)
    }

    throw new Error(
      "Unreachable code, are you sure you are invoking handler from an API route?"
    )
  }

  return handler
}
