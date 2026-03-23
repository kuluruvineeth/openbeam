import prisma, {
  type AppType,
  ConnectorStatus,
  getConnectorsNeedingRefresh as dbGetConnectorsNeedingRefresh,
  decryptIfEncrypted,
  findConnectorById,
  getOAuthProvider,
  recordRefreshFailure,
  updateConnector,
  updateOAuthTokens,
} from "@openbeam/db";
import {
  airtableApp,
  boxApp,
  dropboxApp,
  hubspotApp,
  pipedriveApp,
  refreshAirtableToken,
  refreshAsanaToken,
  refreshBitbucketToken,
  refreshBoxToken,
  refreshConfluenceToken,
  refreshDropboxToken,
  refreshFigmaToken,
  refreshGitHubToken,
  refreshGitLabToken,
  refreshGmailToken,
  refreshGoogleCalendarToken,
  refreshGoogleChatToken,
  refreshGoogleDriveToken,
  refreshHubSpotToken,
  refreshJiraToken,
  refreshLinearToken,
  refreshMicrosoftCalendarToken,
  refreshOutlookToken,
  refreshPipedriveToken,
  refreshSalesforceToken,
  refreshServiceNowToken,
  refreshSharePointToken,
  refreshTeamsToken,
  refreshZoomToken,
  salesforceApp,
} from "@openbeam/integrations";

export async function refreshConnectorToken(
  connectorId: string
): Promise<string> {
  const [oauth, connector] = await Promise.all([
    getOAuthProvider(prisma, connectorId),
    findConnectorById(prisma, connectorId),
  ]);

  if (!oauth) {
    throw new Error(`OAuth provider not found for connector ${connectorId}`);
  }

  if (!connector) {
    throw new Error(`Connector not found: ${connectorId}`);
  }

  if (
    connector.status !== ConnectorStatus.ACTIVE &&
    connector.status !== ConnectorStatus.SYNCING
  ) {
    throw new Error(
      `Connector ${connectorId} is not active (status: ${connector.status})`
    );
  }

  const refreshToken = decryptIfEncrypted(
    oauth.refreshToken,
    oauth.refreshTokenIv
  );
  const clientId = oauth.clientId;
  const clientSecret = decryptIfEncrypted(
    oauth.clientSecret,
    oauth.clientSecretIv
  );

  if (!refreshToken) {
    throw new Error(`No refresh token available for connector ${connectorId}`);
  }

  if (!(clientId && clientSecret)) {
    throw new Error(
      `Missing OAuth client credentials for connector ${connectorId}`
    );
  }

  try {
    let newToken: {
      accessToken: string;
      expiresIn: number;
      refreshToken?: string;
    };

    switch (oauth.app) {
      case "GMAIL":
        newToken = await refreshGmailToken({
          clientId,
          clientSecret,
          refreshToken,
        });
        break;

      case "GOOGLE_DRIVE":
        newToken = await refreshGoogleDriveToken({
          clientId,
          clientSecret,
          refreshToken,
        });
        break;

      case "GOOGLE_CALENDAR":
        newToken = await refreshGoogleCalendarToken({
          clientId,
          clientSecret,
          refreshToken,
        });
        break;

      case "GOOGLE_CHAT":
        newToken = await refreshGoogleChatToken({
          clientId,
          clientSecret,
          refreshToken,
        });
        break;

      case "LINEAR": {
        const linearResult = await refreshLinearToken({
          clientId,
          clientSecret,
          refreshToken,
        });
        newToken = {
          accessToken: linearResult.accessToken,
          expiresIn: linearResult.expiresIn,
          refreshToken: linearResult.refreshToken,
        };
        break;
      }

      case "GITHUB": {
        const githubResult = await refreshGitHubToken({
          clientId,
          clientSecret,
          refreshToken,
        });

        if (githubResult.expiresIn === undefined) {
          throw new Error("GitHub token refresh did not return expiresIn");
        }

        newToken = {
          accessToken: githubResult.accessToken,
          expiresIn: githubResult.expiresIn,
          refreshToken: githubResult.refreshToken,
        };
        break;
      }

      case "GITLAB": {
        const gitlabConfig = connector.config as Record<string, unknown> | null;
        const gitlabInstanceUrl =
          (gitlabConfig?.instance_url as string) || undefined;
        const gitlabResult = await refreshGitLabToken({
          clientId,
          clientSecret,
          refreshToken,
          instanceUrl: gitlabInstanceUrl,
        });
        newToken = {
          accessToken: gitlabResult.accessToken,
          expiresIn: gitlabResult.expiresIn,
          refreshToken: gitlabResult.refreshToken,
        };
        break;
      }

      case "MICROSOFT_CALENDAR":
        newToken = await refreshMicrosoftCalendarToken({
          clientId,
          clientSecret,
          refreshToken,
        });
        break;

      case "OUTLOOK":
        newToken = await refreshOutlookToken({
          clientId,
          clientSecret,
          refreshToken,
        });
        break;

      case "SHAREPOINT":
        newToken = await refreshSharePointToken({
          clientId,
          clientSecret,
          refreshToken,
        });
        break;

      case "MICROSOFT_TEAMS":
        newToken = await refreshTeamsToken({
          clientId,
          clientSecret,
          refreshToken,
        });
        break;

      case "CONFLUENCE": {
        const confluenceResult = await refreshConfluenceToken({
          clientId,
          clientSecret,
          refreshToken,
        });
        newToken = {
          accessToken: confluenceResult.accessToken,
          expiresIn: confluenceResult.expiresIn,
          refreshToken: confluenceResult.refreshToken,
        };
        break;
      }

      case "JIRA": {
        const jiraResult = await refreshJiraToken({
          clientId,
          clientSecret,
          refreshToken,
        });
        newToken = {
          accessToken: jiraResult.accessToken,
          expiresIn: jiraResult.expiresIn,
          refreshToken: jiraResult.refreshToken,
        };
        break;
      }

      case "SALESFORCE": {
        const sfConfig =
          salesforceApp.auth.type === "OAUTH2"
            ? salesforceApp.auth.config
            : undefined;
        if (!sfConfig) {
          throw new Error("Salesforce OAuth config not found");
        }
        const sfResult = await refreshSalesforceToken({
          config: sfConfig,
          clientId,
          clientSecret,
          refreshToken,
        });
        newToken = {
          accessToken: sfResult.accessToken,
          expiresIn: sfResult.expiresIn,
        };
        break;
      }

      case "BOX": {
        const boxConfig =
          boxApp.auth.type === "OAUTH2" ? boxApp.auth.config : undefined;
        if (!boxConfig) {
          throw new Error("Box OAuth config not found");
        }
        const boxResult = await refreshBoxToken({
          config: boxConfig,
          clientId,
          clientSecret,
          refreshToken,
        });
        newToken = {
          accessToken: boxResult.accessToken,
          expiresIn: boxResult.expiresIn,
          refreshToken: boxResult.refreshToken,
        };
        break;
      }

      case "DROPBOX": {
        const dbxConfig =
          dropboxApp.auth.type === "OAUTH2"
            ? dropboxApp.auth.config
            : undefined;
        if (!dbxConfig) {
          throw new Error("Dropbox OAuth config not found");
        }
        const dbxResult = await refreshDropboxToken({
          config: dbxConfig,
          clientId,
          clientSecret,
          refreshToken,
        });
        newToken = {
          accessToken: dbxResult.accessToken,
          expiresIn: dbxResult.expiresIn,
        };
        break;
      }

      case "SERVICENOW": {
        const snConfig = connector.config as Record<string, unknown> | null;
        const snInstance = (snConfig?.instance as string) ?? "";
        if (!snInstance) {
          throw new Error(
            "ServiceNow instance name not found in connector config"
          );
        }
        const snResult = await refreshServiceNowToken({
          instance: snInstance,
          clientId,
          clientSecret,
          refreshToken,
        });
        newToken = {
          accessToken: snResult.accessToken,
          expiresIn: snResult.expiresIn,
          refreshToken: snResult.refreshToken,
        };
        break;
      }

      case "ASANA": {
        const asanaResult = await refreshAsanaToken({
          clientId,
          clientSecret,
          refreshToken,
        });
        newToken = {
          accessToken: asanaResult.accessToken,
          expiresIn: asanaResult.expiresIn,
          refreshToken: asanaResult.refreshToken,
        };
        break;
      }

      case "FIGMA": {
        const figmaResult = await refreshFigmaToken({
          clientId,
          clientSecret,
          refreshToken,
        });
        newToken = {
          accessToken: figmaResult.accessToken,
          expiresIn: figmaResult.expiresIn,
          refreshToken: figmaResult.refreshToken,
        };
        break;
      }

      case "HUBSPOT": {
        const hsConfig =
          hubspotApp.auth.type === "OAUTH2"
            ? hubspotApp.auth.config
            : undefined;
        if (!hsConfig) {
          throw new Error("HubSpot OAuth config not found");
        }
        const hsResult = await refreshHubSpotToken({
          config: hsConfig,
          clientId,
          clientSecret,
          refreshToken,
        });
        newToken = {
          accessToken: hsResult.accessToken,
          expiresIn: hsResult.expiresIn,
          refreshToken: hsResult.refreshToken,
        };
        break;
      }

      case "BITBUCKET": {
        const bitbucketResult = await refreshBitbucketToken({
          clientId,
          clientSecret,
          refreshToken,
        });
        newToken = {
          accessToken: bitbucketResult.accessToken,
          expiresIn: bitbucketResult.expiresIn,
          refreshToken: bitbucketResult.refreshToken,
        };
        break;
      }

      case "ZENDESK":
        throw new Error("Zendesk tokens do not expire");

      case "ZOOM": {
        const zoomResult = await refreshZoomToken({
          clientId,
          clientSecret,
          refreshToken,
        });
        newToken = {
          accessToken: zoomResult.accessToken,
          expiresIn: zoomResult.expiresIn,
          refreshToken: zoomResult.refreshToken,
        };
        break;
      }

      case "INTERCOM":
        throw new Error("Intercom tokens do not expire");

      case "CLICKUP":
        throw new Error("ClickUp tokens do not expire");

      case "SLACK":
        throw new Error("Slack token refresh not implemented");

      case "NOTION":
        throw new Error("Notion tokens do not expire");

      case "WORKDAY": {
        const workdayConfig = connector.config as Record<
          string,
          unknown
        > | null;
        const wdTenant = (workdayConfig?.tenant as string) ?? "";
        const wdHost = (workdayConfig?.host as string) ?? "";
        if (!(wdTenant && wdHost)) {
          throw new Error(
            "Workday tenant and host not found in connector config"
          );
        }
        const { refreshWorkdayToken } = await import("@openbeam/integrations");
        const wdResult = await refreshWorkdayToken({
          clientId,
          clientSecret,
          refreshToken,
          tenant: wdTenant,
          host: wdHost,
        });
        newToken = {
          accessToken: wdResult.accessToken,
          expiresIn: wdResult.expiresIn,
          refreshToken: wdResult.refreshToken,
        };
        break;
      }

      case "PIPEDRIVE": {
        const pdConfig =
          pipedriveApp.auth.type === "OAUTH2"
            ? pipedriveApp.auth.config
            : undefined;
        if (!pdConfig) {
          throw new Error("Pipedrive OAuth config not found");
        }
        const pdResult = await refreshPipedriveToken({
          config: pdConfig,
          clientId,
          clientSecret,
          refreshToken,
        });
        newToken = {
          accessToken: pdResult.accessToken,
          expiresIn: pdResult.expiresIn,
          refreshToken: pdResult.refreshToken,
        };
        break;
      }

      case "AIRTABLE": {
        const atConfig =
          airtableApp.auth.type === "OAUTH2"
            ? airtableApp.auth.config
            : undefined;
        if (!atConfig) {
          throw new Error("Airtable OAuth config not found");
        }
        const atResult = await refreshAirtableToken({
          config: atConfig,
          clientId,
          clientSecret,
          refreshToken,
        });
        newToken = {
          accessToken: atResult.accessToken,
          expiresIn: atResult.expiresIn,
          refreshToken: atResult.refreshToken,
        };
        break;
      }

      case "AZURE_DEVOPS": {
        const { refreshAzureDevOpsToken, azureDevOpsApp } = await import(
          "@openbeam/integrations"
        );
        const adoRedirectUri =
          azureDevOpsApp.auth.type === "OAUTH2"
            ? `${process.env.WEB_URL || "http://localhost:3001"}${azureDevOpsApp.auth.config.redirectPath}`
            : "";
        const adoResult = await refreshAzureDevOpsToken({
          clientId,
          clientSecret,
          refreshToken,
          redirectUri: adoRedirectUri,
        });
        newToken = {
          accessToken: adoResult.accessToken,
          expiresIn: adoResult.expiresIn,
          refreshToken: adoResult.refreshToken,
        };
        break;
      }

      default:
        throw new Error(`Token refresh not implemented for app: ${oauth.app}`);
    }

    await updateOAuthTokens(prisma, {
      connectorId,
      accessToken: newToken.accessToken,
      expiresIn: newToken.expiresIn,
      refreshToken: newToken.refreshToken,
    });

    return newToken.accessToken;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Token refresh failed";

    const updatedOAuth = await recordRefreshFailure(
      prisma,
      connectorId,
      errorMessage
    );

    if (updatedOAuth.refreshFailures >= 3) {
      await updateConnector(prisma, connectorId, {
        status: ConnectorStatus.AUTH_EXPIRED,
        statusChangedAt: new Date(),
        lastError: `Token refresh failed after ${updatedOAuth.refreshFailures} attempts: ${errorMessage}`,
        lastErrorAt: new Date(),
      });
    }

    throw error;
  }
}

function getConnectorsNeedingRefresh(
  bufferSeconds = 300
): Promise<{ connectorId: string; app: AppType }[]> {
  return dbGetConnectorsNeedingRefresh(prisma, bufferSeconds);
}

export async function refreshExpiringTokens(bufferSeconds = 300): Promise<{
  total: number;
  success: number;
  failed: number;
  errors: Array<{ connectorId: string; app: AppType; error: string }>;
}> {
  const connectors = await getConnectorsNeedingRefresh(bufferSeconds);

  const results = {
    total: connectors.length,
    success: 0,
    failed: 0,
    errors: [] as Array<{ connectorId: string; app: AppType; error: string }>,
  };

  for (const { connectorId, app } of connectors) {
    try {
      await refreshConnectorToken(connectorId);
      results.success += 1;
    } catch (error) {
      results.failed += 1;
      results.errors.push({
        connectorId,
        app,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}

export async function getValidAccessToken(
  connectorId: string,
  bufferSeconds = 300
): Promise<string> {
  const oauth = await getOAuthProvider(prisma, connectorId);

  if (!oauth?.accessToken) {
    throw new Error(`No access token found for connector ${connectorId}`);
  }

  const needsRefresh =
    oauth.tokenExpiresAt &&
    Date.now() >= oauth.tokenExpiresAt.getTime() - bufferSeconds * 1000;

  if (needsRefresh) {
    return await refreshConnectorToken(connectorId);
  }

  const accessToken = decryptIfEncrypted(
    oauth.accessToken,
    oauth.accessTokenIv
  );

  if (!accessToken) {
    throw new Error(
      `Failed to decrypt access token for connector ${connectorId}`
    );
  }

  return accessToken;
}
