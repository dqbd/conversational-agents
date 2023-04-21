import { chat } from "./streams/chat"

export const streamRouter = {
  chat,
}

export type StreamRouter = typeof streamRouter
