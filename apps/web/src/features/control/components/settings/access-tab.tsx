"use client";

import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Separator,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@openbeam/ui";
import { format } from "date-fns";
import { useState } from "react";
import { Icons } from "@/components/icons";
import {
  useApproveJoinRequest,
  useControlInvites,
  useControlJoinRequests,
  useControlMembers,
  useCreateInvite,
  useRejectJoinRequest,
  useRevokeInvite,
} from "../../hooks/use-control-settings";
import { ConfirmDialog } from "../shared/confirm-dialog";
import { EmptyState } from "../shared/empty-state";

export function AccessTab() {
  const { data: members } = useControlMembers();
  const { data: invites } = useControlInvites();
  const { data: joinRequests } = useControlJoinRequests();

  const createInviteMutation = useCreateInvite();
  const revokeInviteMutation = useRevokeInvite();
  const approveMutation = useApproveJoinRequest();
  const rejectMutation = useRejectJoinRequest();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [expiresInHours, setExpiresInHours] = useState("24");
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);

  function handleCreateInvite() {
    createInviteMutation.mutate(
      { expiresInHours: Number(expiresInHours) || 24 },
      { onSuccess: () => setInviteOpen(false) }
    );
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-medium text-sm">
            Members ({members?.length ?? 0})
          </p>
        </div>

        {members?.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Principal</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-mono text-xs">
                    {member.principalId.slice(0, 12)}
                  </TableCell>
                  <TableCell>
                    <Badge className="text-[10px]" variant="outline">
                      {member.principalType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs capitalize">
                    {(member.membershipRole ?? "member").toLowerCase()}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs capitalize">
                    {member.status.toLowerCase()}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground text-xs">
                    {member.createdAt
                      ? format(new Date(member.createdAt), "MMM d, yyyy")
                      : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState title="No members" />
        )}
      </section>

      <Separator />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-medium text-sm">
            Invites ({invites?.length ?? 0})
          </p>
          <Dialog onOpenChange={setInviteOpen} open={inviteOpen}>
            <Button
              onClick={() => setInviteOpen(true)}
              size="sm"
              variant="outline"
            >
              <Icons.Plus size={14} />
              Create Invite
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Invite</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <Label className="text-xs">Expires in (hours)</Label>
                  <Input
                    onChange={(e) => setExpiresInHours(e.target.value)}
                    placeholder="24"
                    type="number"
                    value={expiresInHours}
                  />
                </div>
                <Button
                  className="w-full"
                  disabled={createInviteMutation.isPending}
                  onClick={handleCreateInvite}
                  size="sm"
                >
                  {createInviteMutation.isPending ? "Creating..." : "Create"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {invites?.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Token</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invites.map((invite) => (
                <TableRow key={invite.id}>
                  <TableCell className="font-mono text-xs">
                    {invite.tokenHash?.slice(0, 16)}...
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      onClick={() => setRevokeTarget(invite.id)}
                      size="sm"
                      variant="ghost"
                    >
                      Revoke
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-muted-foreground text-xs">No active invites</p>
        )}

        <ConfirmDialog
          confirmLabel="Revoke"
          description="This invite link will no longer be usable."
          destructive
          onConfirm={() => {
            if (revokeTarget) {
              revokeInviteMutation.mutate(
                { inviteId: revokeTarget },
                { onSuccess: () => setRevokeTarget(null) }
              );
            }
          }}
          onOpenChange={(open) => {
            if (!open) {
              setRevokeTarget(null);
            }
          }}
          open={revokeTarget !== null}
          pending={revokeInviteMutation.isPending}
          title="Revoke invite?"
        />
      </section>

      <Separator />

      <section className="space-y-3">
        <p className="font-medium text-sm">
          Join Requests ({joinRequests?.length ?? 0})
        </p>

        {joinRequests?.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {joinRequests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-mono text-xs">
                    {req.id.slice(0, 12)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs capitalize">
                    {req.status?.toLowerCase() ?? "pending"}
                  </TableCell>
                  <TableCell className="flex items-center justify-end gap-1">
                    <Button
                      disabled={approveMutation.isPending}
                      onClick={() =>
                        approveMutation.mutate({ requestId: req.id })
                      }
                      size="sm"
                      variant="ghost"
                    >
                      <Icons.Check size={13} />
                      Approve
                    </Button>
                    <Button
                      disabled={rejectMutation.isPending}
                      onClick={() =>
                        rejectMutation.mutate({ requestId: req.id })
                      }
                      size="sm"
                      variant="ghost"
                    >
                      <Icons.Close size={13} />
                      Reject
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-muted-foreground text-xs">No pending requests</p>
        )}
      </section>
    </div>
  );
}
