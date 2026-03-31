import type { TeamMember } from "./mock-data";

export function MemberRow({ name, email, role }: TeamMember) {
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-x-3 px-3 py-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted font-medium text-muted-foreground text-xs">
        {initial}
      </div>
      <span className="truncate font-medium text-sm">{name}</span>
      <span className="rounded-sm bg-muted px-1.5 py-0.5 text-xs">{role}</span>
      <span className="truncate text-muted-foreground text-xs">{email}</span>
    </div>
  );
}
