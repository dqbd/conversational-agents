import { Button } from "~/components/button";
import { api } from "~/utils/api";
import { useState } from "react";
import { Input } from "~/components/input";


export function AgentFieldGenerate(props: {
  disabled?: boolean;
  onSuccess: (value: string) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const avatars = api.history.generateAvatar.useMutation({
    onSuccess: props.onSuccess,
  });

  return (
    <div className="flex flex-row gap-2">
      <Input
        value={prompt}
        placeholder="Avatar Prompt"
        disabled={props.disabled}
        onChange={(e) => setPrompt(e.target.value)} />

      <Button
        type="button"
        variant="outline"
        className="flex-shrink-0"
        disabled={props.disabled || avatars.isLoading}
        onClick={() => avatars.mutateAsync(prompt)}
      >
        Generate
      </Button>
    </div>
  );
}
