import { Button } from "~/components/button";
import { Input } from "~/components/input";
import { AgentType } from "~/utils/schema";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue
} from "~/components/select";
import { SelectItem } from "~/components/select";
import Add from "~/assets/icons/add.svg";
import { AgentFieldGenerate } from "./AgentFieldGenerate";


export function AgentEditor(props: {
  value: AgentType;
  onChange: (value: AgentType) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {props.value.map((agent, index) => {
        return (
          <div key={index} className="flex flex-col gap-2">
            <Select
              value={agent.model}
              onValueChange={(model) => {
                const value = [...props.value];
                value[index]!.model = model;
                props.onChange(value);
              }}
              disabled={props.disabled}
            >
              <SelectTrigger className="w-[auto] min-w-[256px]">
                <SelectValue placeholder="Model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-3.5-turbo">gpt-3.5-turbo</SelectItem>
                <SelectItem value="gpt-4">gpt-4</SelectItem>
              </SelectContent>
            </Select>

            {agent.avatar && <img src={agent.avatar ?? ""} alt={agent.name} />}

            <Input
              value={agent.avatar}
              placeholder="Avatar"
              className="flex-grow"
              disabled={props.disabled}
              onChange={(e) => {
                const value = [...props.value];
                value[index]!.avatar = e.target.value;
                props.onChange(value);
              }} />

            <AgentFieldGenerate
              onSuccess={(newUrl) => {
                const value = [...props.value];
                value[index]!.avatar = newUrl;
                props.onChange(value);
              }} />

            <Input
              value={agent.name}
              placeholder="Jméno"
              disabled={props.disabled}
              onChange={(e) => {
                const value = [...props.value];
                value[index]!.name = e.target.value;
                props.onChange(value);
              }} />

            <Input
              value={agent.colour}
              placeholder="Barva"
              disabled={props.disabled}
              onChange={(e) => {
                const value = [...props.value];
                value[index]!.colour = e.target.value;
                props.onChange(value);
              }} />

            <Input
              value={agent.system.content}
              className="min-h-[128px]"
              disabled={props.disabled}
              onChange={(e) => {
                const value = [...props.value];
                value[index]!.system.content = e.target.value;
                props.onChange(value);
              }} />

            <Button
              onClick={() => {
                const value = [...props.value];
                value.splice(index, 1);
                props.onChange(value);
              }}
              variant="outline"
              disabled={props.disabled}
            >
              Remove agent
            </Button>
          </div>
        );
      })}

      <div className="flex items-center justify-center">
        <Button
          onClick={() => {
            const value = [...props.value];
            value.push({
              model: "gpt-3.5-turbo",
              name: "",
              colour: "",
              system: {
                role: "system",
                content: "",
              } as const,
            });
            props.onChange(value);
          }}
          className="flex items-center gap-2"
          disabled={props.disabled}
        >
          <Add />
          Add agent
        </Button>
      </div>
    </div>
  );
}
