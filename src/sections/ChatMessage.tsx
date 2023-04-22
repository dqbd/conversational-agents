import { AgentType } from "~/utils/schema"
import { getPrefixedObjects, getTextContent } from "~/utils/msg"
import { cn } from "~/utils/cn"

const SHOW_RAW = true

export function ChatMessage(props: {
  variant: "left" | "right"
  message?: string
  agents: AgentType
}) {
  const prettyPrint =
    (SHOW_RAW ? props.message : getTextContent(props.message)) || "..."

  const meta = getPrefixedObjects(props.message ?? "")

  const agent = props.agents.find((i) => i.name === meta?.author)

  const content = (
    <>
      <span
        className={cn(
          "max-w-[768px] whitespace-pre-wrap rounded-3xl px-4 py-3 text-white",
          agent?.colour ?? "bg-slate-500"
        )}
      >
        {prettyPrint}
      </span>
      {agent?.avatar ? (
        <img
          src={agent?.avatar ?? ""}
          alt={agent?.name}
          className="h-12 w-12 rounded-full"
        />
      ) : (
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full text-center",
            agent?.colour ?? "bg-slate-500"
          )}
        >
          <span className="text-2xl font-bold text-white">
            {agent?.name?.[0]?.toUpperCase()}
          </span>
        </div>
      )}
    </>
  )

  return (
    <div className="flex flex-col gap-4">
      {props.variant === "right" && (
        <div className={cn(`inline-flex max-w-[768px] gap-2 self-end`)}>
          {content}
        </div>
      )}
      {props.variant === "left" && (
        <div
          className={cn(
            `inline-flex max-w-[768px] flex-row-reverse gap-2 self-start`
          )}
        >
          {content}
        </div>
      )}
    </div>
  )
}
