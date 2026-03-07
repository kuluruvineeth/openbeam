import { createHash, randomBytes } from "node:crypto";
import {
  acceptControlInvite,
  approveControlJoinRequest,
  createControlInvite,
  createControlJoinRequest,
  type Database,
  findControlInviteByTokenHash,
  grantControlPermission,
  hasControlPermission,
  listControlAccessGrants,
  listControlCompanyMemberships,
  listControlInvites,
  listControlJoinRequests,
  rejectControlJoinRequest,
  revokeControlInvite,
  revokeControlPermission,
  suspendControlCompanyMembership,
  upsertControlCompanyMembership,
} from "@openbeam/db";
import { ControlServiceError } from "./errors";

const INVITE_TOKEN_BYTES = 32;

function generateInviteToken(): string {
  return randomBytes(INVITE_TOKEN_BYTES).toString("hex");
}

function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createControlInviteForTeam(
  db: Database,
  params: {
    teamId: string;
    expiresInHours?: number;
    invitedByUserId?: string;
    allowedJoinTypes?: string;
    defaultsPayload?: Record<string, unknown>;
  }
) {
  const hours = params.expiresInHours ?? 72;
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
  const token = generateInviteToken();
  const tokenHash = hashInviteToken(token);

  const invite = await createControlInvite(db, {
    teamId: params.teamId,
    tokenHash,
    expiresAt,
    invitedByUserId: params.invitedByUserId,
    allowedJoinTypes: params.allowedJoinTypes,
    defaultsPayload: params.defaultsPayload,
  });

  return { id: invite.id, token, expiresAt: invite.expiresAt };
}

export async function getControlInviteByToken(db: Database, token: string) {
  const tokenHash = hashInviteToken(token);
  const invite = await findControlInviteByTokenHash(db, tokenHash);
  if (!invite) {
    throw ControlServiceError.notFound("Invite");
  }
  return invite;
}

export async function listControlInvitesForTeam(db: Database, teamId: string) {
  return await listControlInvites(db, teamId);
}

export async function revokeControlInviteForTeam(
  db: Database,
  inviteId: string,
  teamId: string
) {
  return await revokeControlInvite(db, inviteId, teamId);
}

export async function acceptControlInviteForTeam(
  db: Database,
  params: {
    token: string;
    requestType: string;
    requestIp: string;
    requestingUserId?: string;
    requestEmailSnapshot?: string;
    agentName?: string;
    adapterType?: string;
    capabilities?: string;
    agentDefaultsPayload?: Record<string, unknown>;
  }
) {
  const invite = await getControlInviteByToken(db, params.token);

  if (!invite.teamId) {
    throw ControlServiceError.unprocessable("Invite has no team");
  }

  const joinRequest = await createControlJoinRequest(db, {
    inviteId: invite.id,
    teamId: invite.teamId,
    requestType: params.requestType,
    requestIp: params.requestIp,
    requestingUserId: params.requestingUserId,
    requestEmailSnapshot: params.requestEmailSnapshot,
    agentName: params.agentName,
    adapterType: params.adapterType as never,
    capabilities: params.capabilities,
    agentDefaultsPayload: params.agentDefaultsPayload,
  });

  await acceptControlInvite(db, invite.id);

  return joinRequest;
}

export async function listControlJoinRequestsForTeam(
  db: Database,
  teamId: string,
  status?: string
) {
  return await listControlJoinRequests(db, teamId, status as never);
}

export async function approveControlJoinRequestForTeam(
  db: Database,
  requestId: string,
  approvedByUserId: string,
  createdAgentId?: string
) {
  return await approveControlJoinRequest(
    db,
    requestId,
    approvedByUserId,
    createdAgentId
  );
}

export async function rejectControlJoinRequestForTeam(
  db: Database,
  requestId: string,
  rejectedByUserId: string
) {
  return await rejectControlJoinRequest(db, requestId, rejectedByUserId);
}

export async function listControlMembersForTeam(db: Database, teamId: string) {
  return await listControlCompanyMemberships(db, teamId);
}

export async function ensureControlMembership(
  db: Database,
  params: {
    teamId: string;
    principalType: "USER" | "AGENT";
    principalId: string;
    membershipRole?: string;
  }
) {
  return await upsertControlCompanyMembership(db, {
    teamId: params.teamId,
    principalType: params.principalType as never,
    principalId: params.principalId,
    membershipRole: params.membershipRole,
  });
}

export async function suspendControlMemberForTeam(
  db: Database,
  params: {
    teamId: string;
    principalType: "USER" | "AGENT";
    principalId: string;
  }
) {
  return await suspendControlCompanyMembership(
    db,
    params.teamId,
    params.principalType as never,
    params.principalId
  );
}

export async function listControlPermissionsForPrincipal(
  db: Database,
  params: {
    teamId: string;
    principalType: string;
    principalId: string;
  }
) {
  return await listControlAccessGrants(
    db,
    params.teamId,
    params.principalType,
    params.principalId
  );
}

export async function checkControlPermission(
  db: Database,
  params: {
    teamId: string;
    principalType: string;
    principalId: string;
    permissionKey: string;
  }
): Promise<boolean> {
  const count = await hasControlPermission(db, params);
  return count > 0;
}

export async function updateControlMemberPermissions(
  db: Database,
  params: {
    teamId: string;
    principalType: "USER" | "AGENT";
    principalId: string;
    grants: Array<{
      permissionKey: string;
      scope?: Record<string, unknown>;
    }>;
    grantedByUserId?: string;
  }
) {
  const currentGrants = await listControlAccessGrants(
    db,
    params.teamId,
    params.principalType,
    params.principalId
  );

  const newKeys = new Set(params.grants.map((g) => g.permissionKey));

  for (const grant of currentGrants) {
    if (!newKeys.has(grant.permissionKey)) {
      await revokeControlPermission(db, {
        teamId: params.teamId,
        principalType: params.principalType as never,
        principalId: params.principalId,
        permissionKey: grant.permissionKey,
      });
    }
  }

  for (const grant of params.grants) {
    await grantControlPermission(db, {
      teamId: params.teamId,
      principalType: params.principalType as never,
      principalId: params.principalId,
      permissionKey: grant.permissionKey,
      scope: grant.scope,
      grantedByUserId: params.grantedByUserId,
    });
  }
}
