import { z } from "zod"

const schema = z.object({
    author: z.string(),
    target: z.string().optional(),
    final: z.string().optional(),
  })


  
export function getPrefixedObjects(msg: string | undefined) {
    const segments =
      msg
        ?.split("\n")
        .filter((i) => i.trim().startsWith("_"))
        .map((i) => i.split(/[=:]/).map((i) => i.trim()))
        .reduce<Record<string, unknown>>((memo, [key, value]) => {
          let objKey = key?.startsWith("_") ? key.substring(1) : key!
          objKey = objKey.toLowerCase()
          memo[objKey] = value ?? ""
  
          if (objKey === "target" && value === "_FINAL") {
            memo["final"] = ""
          }
          return memo
        }, {}) ?? {}
  
    const parsed = schema.safeParse(segments)
    return parsed.success ? parsed.data : null
  }