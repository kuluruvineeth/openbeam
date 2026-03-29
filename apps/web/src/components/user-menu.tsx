"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@openbeam/ui";
import Link from "next/link";
import { useState } from "react";
import { Icons } from "@/components/icons";
import { SignOut } from "@/components/sign-out";
import { ThemeSwitch } from "@/components/theme-switch";
import {
  Avatar,
  AvatarFallback,
  AvatarImageNext,
} from "@/components/ui/avatar";
import { useUserQuery } from "@/hooks/use-user";

type Props = {
  onlySignOut?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function UserMenu({ onlySignOut, onOpenChange }: Props) {
  const { data: user } = useUserQuery();
  const [open, setOpen] = useState(false);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    onOpenChange?.(isOpen);
  };

  return (
    <DropdownMenu modal onOpenChange={handleOpenChange} open={open}>
      <DropdownMenuTrigger asChild>
        <button className="outline-none" type="button">
          <Avatar className="h-8 w-8 cursor-pointer rounded-full transition-opacity hover:opacity-80">
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
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        alignOffset={-4}
        className="z-[200] w-[240px]"
        side="right"
        sideOffset={16}
      >
        {!onlySignOut && (
          <>
            <DropdownMenuLabel>
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="line-clamp-1 block max-w-[155px] truncate">
                    {user?.name}
                  </span>
                  <span className="truncate font-normal text-muted-foreground text-xs">
                    {user?.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                className="flex cursor-pointer items-center gap-2"
                href="/settings/developer"
              >
                <Icons.Settings2 size={16} />
                <span>Developer</span>
              </Link>
            </DropdownMenuItem>
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
