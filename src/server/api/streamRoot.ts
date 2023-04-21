import { chatStream } from "./streams/chat"
import { summaryStream } from "./streams/summary"

export const streamRouter = {
  summary: summaryStream,
  chat: chatStream,
}

export type StreamRouter = typeof streamRouter
