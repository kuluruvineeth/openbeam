import type {
  SlackUser,
  TransformContext,
} from "@openbeam/types/services/connectors/slack";
import type { Entity, JsonObject, JsonValue } from "@openbeam/vespa";

export function transformUser(
  user: SlackUser,
  context: TransformContext
): Entity {
  const { connectorId, teamId } = context;

  const entityId = `${connectorId}_user_${user.id}`;
  const now = Date.now();

  return {
    id: entityId,
    entity_type: getUserEntityType(user),
    connector_id: connectorId,
    team_id: teamId,
    external_id: user.id,
    name: getDisplayName(user),
    email: user.profile?.email,
    avatar_url: getAvatarUrl(user),
    metadata: buildUserMetadata(user),
    created_at: user.updated ? user.updated * 1000 : now,
    updated_at: now,
    is_active: !user.deleted,
  };
}

export function transformUsers(
  users: SlackUser[],
  context: TransformContext
): Entity[] {
  return users.map((user) => transformUser(user, context));
}

function getUserEntityType(user: SlackUser): string {
  if (user.is_bot || user.is_app_user) {
    return "bot";
  }
  if (user.is_admin || user.is_owner) {
    return "admin";
  }
  return "user";
}

function getDisplayName(user: SlackUser): string {
  const profile = user.profile;

  if (profile?.display_name?.trim()) {
    return profile.display_name;
  }

  if (profile?.real_name?.trim()) {
    return profile.real_name;
  }

  if (user.real_name?.trim()) {
    return user.real_name;
  }

  return user.name;
}

function getAvatarUrl(user: SlackUser): string | undefined {
  const profile = user.profile;

  if (!profile) {
    return;
  }

  // Return largest available
  return (
    profile.image_512 ||
    profile.image_192 ||
    profile.image_72 ||
    profile.image_48 ||
    profile.image_32 ||
    profile.image_24
  );
}

function buildUserMetadata(user: SlackUser): JsonObject {
  const profile = user.profile;

  const base: JsonObject = {
    username: user.name,
    is_bot: user.is_bot ?? false,
    is_app_user: user.is_app_user ?? false,
    is_admin: user.is_admin ?? false,
    is_owner: user.is_owner ?? false,
    is_primary_owner: user.is_primary_owner ?? false,
    is_restricted: user.is_restricted ?? false,
    is_ultra_restricted: user.is_ultra_restricted ?? false,
    deleted: user.deleted ?? false,
  };

  const optional: Record<string, JsonValue | undefined> = {
    title: profile?.title,
    status_text: profile?.status_text,
    status_emoji: profile?.status_emoji,
    phone: profile?.phone,
    timezone: user.tz,
    timezone_label: user.tz_label,
    team_id: user.team_id,
  };

  for (const [key, value] of Object.entries(optional)) {
    if (value !== undefined) {
      base[key] = value;
    }
  }

  return base;
}

export function isHuman(user: SlackUser): boolean {
  return !(user.is_bot || user.is_app_user);
}

export function isActive(user: SlackUser): boolean {
  return !user.deleted;
}

export function isAdmin(user: SlackUser): boolean {
  return user.is_admin === true || user.is_owner === true;
}

export function getEmailDomain(user: SlackUser): string | undefined {
  const email = user.profile?.email;

  if (!email) {
    return;
  }

  const parts = email.split("@");
  return parts.length === 2 ? parts[1] : undefined;
}

export function getUserIdentityKey(user: SlackUser): string {
  // Prefer email, fall back to user ID
  return user.profile?.email ?? `slack:${user.id}`;
}
