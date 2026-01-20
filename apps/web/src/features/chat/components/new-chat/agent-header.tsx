type Agent = {
  name: string;
  description?: string;
};

type Props = {
  agent?: Agent;
};

export function AgentHeader({ agent }: Props) {
  if (!agent) {
    return null;
  }

  return (
    <div className="mb-8 flex w-full items-center justify-between">
      <div>
        <h1 className="font-display text-3xl text-foreground">{agent.name}</h1>
      </div>
      {agent.description && (
        <div className="w-1/2 pl-5">
          <p className="line-clamp-2 text-right text-muted-foreground">
            {agent.description}
          </p>
        </div>
      )}
    </div>
  );
}
