"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUserQuery } from "@/hooks/use-user";
import { SignOut } from "./sign-out";
import { ThemeSwitch } from "./theme-switch";
import { Avatar, AvatarFallback, AvatarImageNext } from "./ui/avatar";

type Props = {
  onlySignOut?: boolean;
};

export function UserMenu({ onlySignOut }: Props) {
  const { data: user } = useUserQuery();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="h-8 w-8 cursor-pointer rounded-full">
          {user?.image && (
            <AvatarImageNext
              alt={user?.name ?? ""}
              height={32}
              quality={100}
              src={user?.image}
              width={32}
            />
          )}
          <AvatarFallback>
            <span className="text-xs">
              {user?.name?.charAt(0)?.toUpperCase()}
            </span>
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[240px]" sideOffset={10}>
        {!onlySignOut && (
          <>
            <DropdownMenuLabel>
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="line-clamp-1 block max-w-[155px] truncate">
                    {user?.name}
                  </span>
                  <span className="truncate font-normal text-[#606060] text-xs">
                    {user?.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />
            <div className="flex flex-row items-center justify-between p-2">
              <p className="text-sm">Theme</p>
              <ThemeSwitch />
            </div>
            <DropdownMenuSeparator />
          </>
        )}

        <SignOut />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
