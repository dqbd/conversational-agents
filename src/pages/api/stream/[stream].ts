import { streamRouter } from "~/server/api/streamRoot"
import { createStreamHandler } from "~/stream/stream.server"

export default createStreamHandler({ router: streamRouter })
