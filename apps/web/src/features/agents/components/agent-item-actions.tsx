"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Icons,
} from "@openbeam/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type MouseEvent, useState } from "react";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import { useAgentCreationParams } from "../hooks/use-agent-creation-params";

type AgentItemActionsProps = {
  id: string;
  name?: string;
};

export function AgentItemActions({ id, name }: AgentItemActionsProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { openEdit } = useAgentCreationParams();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const deleteMutation = useMutation({
    ...trpc.agentCanvas.delete.mutationOptions(),
    onSuccess: () => {
      toast.success("Agent deleted");
      queryClient.invalidateQueries({
        queryKey: trpc.agentCanvas.list.queryKey(),
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleEdit = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openEdit(id);
  };

  const handleDeleteClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = () => {
    deleteMutation.mutate({ canvasId: id });
    setShowDeleteDialog(false);
  };

  return (
    <>
      <span className="flex flex-row gap-2">
        <Button
          className="size-7 rounded-full bg-background"
          onClick={handleEdit}
          size="icon"
          variant="outline"
        >
          <Icons.Pencil size={14} />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className="size-7 rounded-full bg-background"
              size="icon"
              variant="outline"
            >
              <Icons.MoreHorizontal size={14} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={handleDeleteClick}
            >
              <Icons.Trash className="mr-2" size={16} />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </span>

      <AlertDialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
        <AlertDialogContent onClick={handleClick}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agent</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete
              {name ? ` "${name}"` : " this agent"}? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={handleDeleteConfirm}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
