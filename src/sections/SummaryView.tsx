
export function SummaryView(props: { summary: string | null; }) {
  if (props.summary) {
    return (
      <div className="bottom-4 flex-row">
        <h3 className="text-xl font-bold">Conversation summary</h3>
        <span>{props.summary}</span>
      </div>
    );
  }

  return null;
}
