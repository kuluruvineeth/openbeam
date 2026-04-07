import type { ConnectorActionsRegistry } from "@openbeam/types/connector-actions";
import { fileActions } from "./files";
import { folderActions } from "./folders";
import { permissionActions } from "./permissions";

export const googleDriveActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "google_drive",
  connectorName: "Google Drive",
  connectorIcon: "google-drive",
  actions: [...fileActions, ...permissionActions, ...folderActions],
};
