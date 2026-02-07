"use client";

import { Button } from "@openplane/ui";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useOnClickOutside } from "usehooks-ts";
import { Icons } from "@/components/icons";
import {
  Avatar,
  AvatarFallback,
  AvatarImageNext,
} from "@/components/ui/avatar";
import { useChangeTeam, useTeams } from "@/hooks/use-team";
import { useUserQuery } from "@/hooks/use-user";

type Props = {
  isExpanded?: boolean;
};

export function TeamDropdown({ isExpanded = false }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { data: user } = useUserQuery();
  const queryClient = useQueryClient();

  const [selectedId, setSelectedId] = useState<string | undefined>(
    user?.teamId ?? undefined
  );
  const [isActive, setActive] = useState(false);
  const [isChangingTeam, setIsChangingTeam] = useState(false);

  const changeTeamMutation = useChangeTeam();

  const { data: teams } = useTeams();

  useEffect(() => {
    if (user?.teamId) {
      setSelectedId(user.teamId);
    } else {
      setSelectedId(undefined);
    }
  }, [user?.teamId]);

  const sortedTeams =
    teams?.sort((a, b) => {
      if (a.id === selectedId) {
        return -1;
      }
      if (b.id === selectedId) {
        return 1;
      }

      return (a.id ?? "").localeCompare(b.id ?? "");
    }) ?? [];

  //@ts-expect-error
  useOnClickOutside(ref, () => {
    if (!isChangingTeam) {
      setActive(false);
    }
  });

  const toggleActive = () => setActive((prev) => !prev);

  const handleTeamChange = async (teamId: string) => {
    if (teamId === selectedId) {
      toggleActive();
      return;
    }

    setIsChangingTeam(true);
    setSelectedId(teamId);
    setActive(false);

    try {
      await changeTeamMutation.mutateAsync({ teamId });
      await queryClient.invalidateQueries();
    } finally {
      setIsChangingTeam(false);
    }
  };

  return (
    <div className="relative h-[32px]" ref={ref}>
      <div className="fixed bottom-4 left-[19px] z-10 h-[32px] w-[32px]">
        <div className="relative h-[32px] w-[32px]">
          <AnimatePresence>
            {isActive && (
              <motion.div
                animate={{
                  y: -(32 + 10) * sortedTeams.length,
                  opacity: 1,
                }}
                className="absolute left-0 h-[32px] w-[32px] overflow-hidden"
                initial={{ y: 0, opacity: 0 }}
                style={{ zIndex: sortedTeams.length + 1 }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 25,
                  mass: 1.2,
                }}
              >
                <Link href={"/teams/create"} onClick={() => setActive(false)}>
                  <Button
                    className="h-[32px] w-[32px]"
                    size="icon"
                    variant="outline"
                  >
                    <Icons.Plus />
                  </Button>
                </Link>
              </motion.div>
            )}
            {sortedTeams.map((team, index) => (
              <motion.div
                animate={
                  isActive
                    ? {
                        y: -(32 + 10) * index,
                        scale: "100%",
                      }
                    : {
                        scale: `${100 - index * 16}%`,
                        y: index * 5,
                      }
                }
                className="absolute left-0 h-[32px] w-[32px] overflow-hidden"
                initial={{
                  scale: `${100 - index * 16}%`,
                  y: index * 5,
                }}
                key={team.id}
                style={{ zIndex: sortedTeams.length - index }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 25,
                  mass: 1.2,
                }}
              >
                <Avatar
                  className="h-[32px] w-[32px] cursor-pointer rounded-none border border-border"
                  onClick={() => {
                    if (index === 0) {
                      toggleActive();
                    } else {
                      handleTeamChange(team?.id ?? "");
                    }
                  }}
                >
                  <AvatarImageNext
                    alt={team?.name ?? ""}
                    height={20}
                    quality={100}
                    src={team?.logoUrl ?? ""}
                    width={20}
                  />
                  <AvatarFallback className="h-[32px] w-[32px] rounded-none">
                    <span className="text-xs">
                      {team?.name?.charAt(0)?.toUpperCase()}
                      {team?.name?.charAt(1)?.toUpperCase()}
                    </span>
                  </AvatarFallback>
                </Avatar>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {isExpanded && sortedTeams[0] && (
        <div className="fixed bottom-4 left-[62px] flex h-[32px] items-center">
          <button
            className="cursor-pointer truncate text-primary text-sm transition-opacity duration-200 ease-in-out hover:opacity-80"
            onClick={(e) => {
              e.stopPropagation();
              toggleActive();
            }}
            type="button"
          >
            {sortedTeams[0].name}
          </button>
        </div>
      )}
    </div>
  );
}
