import type { App as McpApp } from "@modelcontextprotocol/ext-apps";
import { useState } from "react";
import { ErrorState } from "../../shared/error-state";
import { BrowseStep } from "./browse-step";
import { OAuthStep } from "./oauth-step";
import { SuccessStep } from "./success-step";
import type { AvailableConnector, SetupData, SetupStep } from "./types";

type ConnectorSetupViewProps = {
  app: McpApp;
  connectors: AvailableConnector[];
  initialSetupData?: SetupData;
};

export function ConnectorSetupView({
  app,
  connectors,
  initialSetupData,
}: ConnectorSetupViewProps) {
  const [step, setStep] = useState<SetupStep>(
    initialSetupData?.oauthUrl ? "oauth" : "browse"
  );
  const [setupData, setSetupData] = useState<SetupData>(initialSetupData ?? {});
  const [connectorId, setConnectorId] = useState<string | null>(
    initialSetupData?.connectorId ?? null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSelectConnector = async (connector: AvailableConnector) => {
    if (connector.authType !== "OAUTH2") {
      setErrorMessage(
        `${connector.name} uses ${connector.authType}. API key setup coming soon.`
      );
      setStep("error");
      return;
    }

    try {
      const result = await app.callServerTool({
        name: "connector_setup",
        arguments: { app: connector.id },
      });

      const sc = result.structuredContent as SetupData | undefined;
      if (result.isError || !sc?.oauthUrl) {
        setErrorMessage("Failed to start setup. Try again.");
        setStep("error");
        return;
      }

      setSetupData(sc);
      setStep("oauth");
    } catch {
      setErrorMessage("Failed to start setup. Try again.");
      setStep("error");
    }
  };

  const handleOAuthComplete = (id: string) => {
    setConnectorId(id);
    setStep("success");
  };

  const handleError = (message: string) => {
    setErrorMessage(message);
    setStep("error");
  };

  const handleRetry = () => {
    setStep("browse");
    setSetupData({});
    setConnectorId(null);
    setErrorMessage(null);
  };

  if (step === "browse") {
    return (
      <BrowseStep connectors={connectors} onSelect={handleSelectConnector} />
    );
  }

  if (step === "oauth" && setupData.oauthUrl) {
    return (
      <OAuthStep
        app={app}
        onComplete={handleOAuthComplete}
        onError={handleError}
        setupData={setupData}
      />
    );
  }

  if (step === "success" && connectorId) {
    return (
      <SuccessStep
        app={app}
        appId={setupData.app?.id ?? ""}
        appName={setupData.app?.name ?? "Connector"}
        connectorId={connectorId}
      />
    );
  }

  return (
    <ErrorState
      message={errorMessage ?? "Something went wrong"}
      onRetry={handleRetry}
    />
  );
}
