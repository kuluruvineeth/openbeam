"use client";

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
import { Button } from "@/components/ui/button";
import {
  useChangeOrganization,
  useOrganizations,
} from "@/hooks/use-organization";
import { useUserQuery } from "@/hooks/use-user";

type Props = {
  isExpanded?: boolean;
};

export function OrgDropdown({ isExpanded = false }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { data: user } = useUserQuery();
  const queryClient = useQueryClient();

  const [selectedId, setSelectedId] = useState<string | undefined>(
    user?.organizationId
  );
  const [isActive, setActive] = useState(false);
  const [isChangingOrganization, setIsChangingOrganization] = useState(false);

  const changeOrganizationMutation = useChangeOrganization();

  const { data: organizations } = useOrganizations();

  useEffect(() => {
    if (user?.organizationId) {
      setSelectedId(user.organizationId);
    }
  }, [user?.organizationId]);

  const sortedOrganizations =
    organizations?.sort((a, b) => {
      if (a.id === selectedId) {
        return -1;
      }
      if (b.id === selectedId) {
        return 1;
      }

      return (a.id ?? "").localeCompare(b.id ?? "");
    }) ?? [];

  // @ts-expect-error
  useOnClickOutside(ref, () => {
    if (!isChangingOrganization) {
      setActive(false);
    }
  });

  const toggleActive = () => setActive((prev) => !prev);

  const handleOrganizationChange = async (organizationId: string) => {
    if (organizationId === selectedId) {
      toggleActive();
      return;
    }

    setIsChangingOrganization(true);
    setSelectedId(organizationId);
    setActive(false);

    try {
      await changeOrganizationMutation.mutateAsync({ organizationId });
      await queryClient.invalidateQueries();
    } finally {
      setIsChangingOrganization(false);
    }
  };

  return (
    <div className="relative h-[32px]" ref={ref}>
      {/* Avatar - fixed position that absolutely never changes */}
      <div className="fixed bottom-4 left-[19px] h-[32px] w-[32px]">
        <div className="relative h-[32px] w-[32px]">
          <AnimatePresence>
            {isActive && (
              <motion.div
                animate={{
                  y: -(32 + 10) * sortedOrganizations.length,
                  opacity: 1,
                }}
                className="absolute left-0 h-[32px] w-[32px] overflow-hidden"
                initial={{ y: 0, opacity: 0 }}
                style={{ zIndex: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 25,
                  mass: 1.2,
                }}
              >
                {/* @ts-expect-error - Next.js route type inference doesn't recognize /orgs/create */}
                <Link href="/orgs/create" onClick={() => setActive(false)}>
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
            {sortedOrganizations.map((organization, index) => (
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
                key={organization.id}
                style={{ zIndex: -index }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 25,
                  mass: 1.2,
                }}
              >
                <Avatar
                  className="h-[32px] w-[32px] cursor-pointer rounded-none border border-[#DCDAD2] dark:border-[#2C2C2C]"
                  onClick={() => {
                    if (index === 0) {
                      toggleActive();
                    } else {
                      handleOrganizationChange(organization?.id ?? "");
                    }
                  }}
                >
                  <AvatarImageNext
                    alt={organization?.name ?? ""}
                    height={20}
                    quality={100}
                    src={organization?.logoUrl ?? ""}
                    width={20}
                  />
                  <AvatarFallback className="h-[32px] w-[32px] rounded-none">
                    <span className="text-xs">
                      {organization?.name?.charAt(0)?.toUpperCase()}
                      {organization?.name?.charAt(1)?.toUpperCase()}
                    </span>
                  </AvatarFallback>
                </Avatar>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Team name - appears to the right of the fixed avatar */}
      {isExpanded && sortedOrganizations[0] && (
        <div className="fixed bottom-4 left-[62px] flex h-[32px] items-center">
          <button
            className="cursor-pointer truncate text-primary text-sm transition-opacity duration-200 ease-in-out hover:opacity-80"
            onClick={(e) => {
              e.stopPropagation();
              toggleActive();
            }}
            type="button"
          >
            {sortedOrganizations[0].name}
          </button>
        </div>
      )}
    </div>
  );
}
