import { type NextApiRequest, type NextApiResponse } from "next"

export interface StreamProcedure<Input, TResponse> {
  input?: Input
  response?: TResponse
  handler: (req: NextApiRequest, res: NextApiResponse) => void
  edgeHandler: (req: Request) => Promise<Response>
}

export type StreamRouterType = Record<string, StreamProcedure<unknown, unknown>>
