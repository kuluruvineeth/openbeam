import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@openbeam/ui/components/avatar";
import { ConnectorLogo } from "../../shared/connector-logo";
import type { Person } from "./mock-data";

type PersonCardProps = {
  person: Person;
};

export function PersonCard({ person }: PersonCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-sm border border-border/50 px-3 py-2">
      <Avatar className="h-8 w-8">
        {person.avatarUrl && (
          <AvatarImage alt={person.name} src={person.avatarUrl} />
        )}
        <AvatarFallback className="font-medium text-muted-foreground text-xs">
          {person.name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium text-sm">{person.name}</span>
        {person.title && (
          <span className="truncate text-muted-foreground text-xs">
            {person.title}
            {person.department && ` \u00b7 ${person.department}`}
          </span>
        )}
        {person.email && (
          <span className="truncate text-muted-foreground text-xs">
            {person.email}
          </span>
        )}
      </div>
      {person.connectorType && (
        <div className="shrink-0">
          <ConnectorLogo size={16} type={person.connectorType} />
        </div>
      )}
    </div>
  );
}
