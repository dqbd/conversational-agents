import { Button } from "~/components/button"
import { RouterOutputs } from "~/utils/api"
import { useState } from "react"
import Head from "next/head"

import { createTRPCContext } from "~/server/api/trpc"
import { appRouter } from "~/server/api/root"
import { NextApiRequest, NextApiResponse } from "next"
import { Chat } from "~/sections/Chat"

export const DID_API = {
  key: "[DID_API_KEY]",
  url: "https://api.d-id.com",
} as const

export default function Page(props: {
  shared: RouterOutputs["history"]["get"]
}) {
  const [state, setState] = useState(false)
  return (
    <>
      <Head>
        <title>Conversation Test</title>
      </Head>
      <div className="mx-auto flex max-w-[1280px] flex-col gap-6 p-4">
        <div className="flex flex-col items-center">
          {!state ? (
            <Button onClick={() => setState(true)}>
              Start the ✨experience✨
            </Button>
          ) : (
            <Chat shared={props.shared} />
          )}
        </div>
      </div>
    </>
  )
}

export const getServerSideProps = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  const ctx = await createTRPCContext({ req, res })
  const caller = appRouter.createCaller(ctx)

  if (req.query.id == null) {
    return { props: { shared: null } }
  }

  const shared = await caller.history.get({ id: req.query.id as string })
  return { props: { shared } }
}
