import type { SmartThingsTransformContext } from "@openbeam/types/services/connectors/smartthings";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { SmartThingsScene } from "../client";

function buildSceneContent(scene: SmartThingsScene): string {
  const parts: string[] = [];

  if (scene.editable != null) {
    parts.push(`Editable: ${scene.editable}`);
  }

  if (scene.lastExecutedDate) {
    parts.push(`Last Executed: ${scene.lastExecutedDate}`);
  }

  return parts.join("\n");
}

function buildSceneMetadata(
  scene: SmartThingsScene
): GenericDocument["metadata"] {
  return {
    sceneId: scene.sceneId,
    ...(scene.locationId && { locationId: scene.locationId }),
    ...(scene.createdBy && { createdBy: scene.createdBy }),
    ...(scene.editable != null && { editable: scene.editable }),
    ...(scene.lastExecutedDate && {
      lastExecutedDate: scene.lastExecutedDate,
    }),
    ...(scene.sceneColor && { sceneColor: scene.sceneColor }),
  };
}

export async function transformScene(
  scene: SmartThingsScene,
  context: SmartThingsTransformContext
): Promise<GenericDocument> {
  const title = scene.sceneName;
  const content = buildSceneContent(scene);
  const metadata = buildSceneMetadata(scene);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const updatedAt = scene.lastUpdatedDate
    ? new Date(scene.lastUpdatedDate).getTime()
    : Date.now();
  const createdAt = scene.createdDate
    ? new Date(scene.createdDate).getTime()
    : updatedAt;

  return {
    id: `${context.connectorId}_scene_${scene.sceneId}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: scene.sceneId,
    document_type: "scene",
    document_subtype: "automation_scene",
    title,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    source_type: "smartthings",
    source_name: "SmartThings",
    url: `https://my.smartthings.com/scenes/${scene.sceneId}`,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}

export function transformScenes(
  scenes: SmartThingsScene[],
  context: SmartThingsTransformContext
): Promise<GenericDocument[]> {
  return Promise.all(scenes.map((scene) => transformScene(scene, context)));
}
