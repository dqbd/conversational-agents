import { chat } from "./streams/chat"
import { first } from "./streams/first"
import { second } from "./streams/second"
import { summaryStream } from "./streams/summary"

export const streamRouter = {
  chat: chat,
  summary: summaryStream,
  first: first,
  second: second,
}

export type StreamRouter = typeof streamRouter
