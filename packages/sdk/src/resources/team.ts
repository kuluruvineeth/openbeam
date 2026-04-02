import type { HttpClient } from "../client";
import type { RequestOptions, Team, TeamMember } from "../types";

interface InviteResult {
  id: string;
  email: string;
  role: string;
  code: string;
  createdAt: string | null;
}

interface RoleUpdateResult {
  userId: string;
  role: string;
}

interface MemberRemovedResult {
  userId: string;
  removed: boolean;
}

export class TeamResource {
  private readonly client: HttpClient;
  constructor(client: HttpClient) {
    this.client = client;
  }

  async info(options?: RequestOptions): Promise<{ data: Team }> {
    return await this.client.callTool<{ data: Team }>("team_info", {}, options);
  }

  async members(options?: RequestOptions): Promise<{ data: TeamMember[] }> {
    return await this.client.callTool<{ data: TeamMember[] }>(
      "team_members",
      {},
      options
    );
  }

  async inviteMember(
    email: string,
    role: "ADMIN" | "MEMBER" = "MEMBER",
    options?: RequestOptions
  ): Promise<{ data: InviteResult }> {
    return await this.client.callTool<{ data: InviteResult }>(
      "team_invite_member",
      { email, role },
      options
    );
  }

  async removeMember(
    userId: string,
    options?: RequestOptions
  ): Promise<{ data: MemberRemovedResult }> {
    return await this.client.callTool<{ data: MemberRemovedResult }>(
      "team_remove_member",
      { userId },
      options
    );
  }

  async updateRole(
    userId: string,
    role: "OWNER" | "ADMIN" | "MEMBER",
    options?: RequestOptions
  ): Promise<{ data: RoleUpdateResult }> {
    return await this.client.callTool<{ data: RoleUpdateResult }>(
      "team_update_role",
      { userId, role },
      options
    );
  }
}
