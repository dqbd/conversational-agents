declare module "slack-to-html" {
  export function escapeForSlackWithMarkdown(
    text: string,
    options: {
      users: Record<string, string>
    }
  ): string
}
