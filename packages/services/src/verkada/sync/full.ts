import type {
  VerkadaSyncBatch,
  VerkadaTransformContext,
} from "@openplane/types/services/connectors/verkada";
import type { GenericDocument } from "@openplane/vespa";
import type { VerkadaClient } from "../client";
import type { VerkadaCamera } from "../transformers/camera";
import { transformCameras } from "../transformers/camera";
import type { VerkadaDoor } from "../transformers/door";
import { transformDoors } from "../transformers/door";
import type { VerkadaSensor } from "../transformers/sensor";
import { transformSensors } from "../transformers/sensor";
import { createSyncBatch } from "./utils";

interface VerkadaCameraResponse {
  cameras: VerkadaCamera[];
  next_page_token: string | null;
}

interface VerkadaDoorResponse {
  doors: VerkadaDoor[];
  next_page_token: string | null;
}

interface VerkadaSensorResponse {
  sensors: VerkadaSensor[];
  next_page_token: string | null;
}

async function* paginateCameras(
  client: VerkadaClient,
  context: VerkadaTransformContext,
  pageSize: string
): AsyncGenerator<VerkadaSyncBatch<GenericDocument>, void, undefined> {
  let pageToken: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const params: Record<string, string> = { page_size: pageSize };
    if (pageToken) {
      params.page_token = pageToken;
    }

    const response = await client.get<VerkadaCameraResponse>(
      "/cameras/v1/devices",
      params
    );

    const documents = await transformCameras(response.cameras, context);
    hasMore = response.next_page_token != null;
    pageToken = response.next_page_token ?? undefined;

    yield createSyncBatch(
      documents,
      { lastSyncTime: Date.now() },
      "cameras",
      hasMore
    );
  }
}

async function* paginateDoors(
  client: VerkadaClient,
  context: VerkadaTransformContext,
  pageSize: string
): AsyncGenerator<VerkadaSyncBatch<GenericDocument>, void, undefined> {
  let pageToken: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const params: Record<string, string> = { page_size: pageSize };
    if (pageToken) {
      params.page_token = pageToken;
    }

    const response = await client.get<VerkadaDoorResponse>(
      "/access/v1/doors",
      params
    );

    const documents = await transformDoors(response.doors, context);
    hasMore = response.next_page_token != null;
    pageToken = response.next_page_token ?? undefined;

    yield createSyncBatch(
      documents,
      { lastSyncTime: Date.now() },
      "doors",
      hasMore
    );
  }
}

async function* paginateSensors(
  client: VerkadaClient,
  context: VerkadaTransformContext,
  pageSize: string
): AsyncGenerator<VerkadaSyncBatch<GenericDocument>, void, undefined> {
  let pageToken: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const params: Record<string, string> = { page_size: pageSize };
    if (pageToken) {
      params.page_token = pageToken;
    }

    const response = await client.get<VerkadaSensorResponse>(
      "/environment/v1/devices",
      params
    );

    const documents = await transformSensors(response.sensors, context);
    hasMore = response.next_page_token != null;
    pageToken = response.next_page_token ?? undefined;

    yield createSyncBatch(
      documents,
      { lastSyncTime: Date.now() },
      "sensors",
      hasMore
    );
  }
}

interface FullSyncOptions {
  pageSize?: number;
  syncCameras?: boolean;
  syncDoors?: boolean;
  syncSensors?: boolean;
}

export async function* fullSync(
  client: VerkadaClient,
  context: VerkadaTransformContext,
  options: FullSyncOptions = {}
): AsyncGenerator<VerkadaSyncBatch<GenericDocument>, void, undefined> {
  const {
    pageSize = 100,
    syncCameras = true,
    syncDoors = true,
    syncSensors = true,
  } = options;

  const pageSizeStr = String(Math.min(pageSize, 200));

  if (syncCameras) {
    for await (const batch of paginateCameras(client, context, pageSizeStr)) {
      yield batch;
    }
  }

  if (syncDoors) {
    for await (const batch of paginateDoors(client, context, pageSizeStr)) {
      yield batch;
    }
  }

  if (syncSensors) {
    for await (const batch of paginateSensors(client, context, pageSizeStr)) {
      yield batch;
    }
  }
}
