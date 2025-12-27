import { Icons } from "@/components/icons";

type FavoriteAgent = {
  externalId: string;
  name: string;
  description?: string;
};

type Props = {
  favoriteAgents: FavoriteAgent[];
};

export function FavoriteAgents({ favoriteAgents }: Props) {
  if (favoriteAgents.length === 0) {
    return null;
  }

  return (
    <div className="absolute right-0 bottom-0 left-0 border-border border-t bg-background p-4">
      <div className="mx-auto max-w-full">
        <h2 className="mb-4 flex items-center justify-center text-center font-bold font-mono text-muted-foreground text-sm">
          <Icons.Agents className="mr-2 mb-1 h-5 w-5" />
          YOUR AGENTS
        </h2>
        <div className="no-scrollbar flex space-x-4 overflow-x-auto pb-2">
          {favoriteAgents.map((item) => (
            <div
              className="w-64 shrink-0 cursor-pointer rounded-md border border-border bg-card p-4 transition-colors hover:bg-accent"
              key={item.externalId}
            >
              <h3 className="mb-1 font-semibold text-card-foreground text-sm">
                {item.name}
              </h3>
              {item.description && (
                <p className="line-clamp-2 text-muted-foreground text-xs">
                  {item.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
