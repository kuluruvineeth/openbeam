import type {
  ThingsboardSyncBatch,
  ThingsboardTransformContext,
} from "@openbeam/types/services/connectors/thingsboard";
import type { GenericDocument } from "@openbeam/vespa";
import type { ThingsboardClient } from "../client";
import { transformAlarms } from "../transformers/alarm";
import { transformDashboards } from "../transformers/dashboard";
import { transformDevices } from "../transformers/device";
import { createSyncBatch } from "./utils";

interface FullSyncOptions {
  pageSize?: number;
  syncAlarms?: boolean;
  syncDashboards?: boolean;
}

export async function* fullSync(
  client: ThingsboardClient,
  context: ThingsboardTransformContext,
  options: FullSyncOptions = {}
): AsyncGenerator<ThingsboardSyncBatch<GenericDocument>, void, undefined> {
  const { pageSize = 100, syncAlarms = true, syncDashboards = true } = options;

  let devicePage = 0;
  let hasMoreDevices = true;

  while (hasMoreDevices) {
    const response = await client.listDevices({
      page: devicePage,
      pageSize,
    });

    if (response.data.length > 0) {
      const deviceDocs = await transformDevices(response.data, context);
      hasMoreDevices = response.hasNext;
      devicePage += 1;

      yield createSyncBatch(
        deviceDocs,
        { lastSyncTime: Date.now() },
        "devices",
        hasMoreDevices || syncAlarms || syncDashboards
      );
    } else {
      hasMoreDevices = false;
    }
  }

  if (syncAlarms) {
    let alarmPage = 0;
    let hasMoreAlarms = true;

    while (hasMoreAlarms) {
      const response = await client.listAlarms({
        page: alarmPage,
        pageSize,
      });

      if (response.data.length > 0) {
        const alarmDocs = await transformAlarms(response.data, context);
        hasMoreAlarms = response.hasNext;
        alarmPage += 1;

        yield createSyncBatch(
          alarmDocs,
          { lastSyncTime: Date.now() },
          "alarms",
          hasMoreAlarms || syncDashboards
        );
      } else {
        hasMoreAlarms = false;
      }
    }
  }

  if (syncDashboards) {
    let dashboardPage = 0;
    let hasMoreDashboards = true;

    while (hasMoreDashboards) {
      const response = await client.listDashboards({
        page: dashboardPage,
        pageSize,
      });

      if (response.data.length > 0) {
        const dashboardDocs = await transformDashboards(response.data, context);
        hasMoreDashboards = response.hasNext;
        dashboardPage += 1;

        yield createSyncBatch(
          dashboardDocs,
          { lastSyncTime: Date.now() },
          "dashboards",
          hasMoreDashboards
        );
      } else {
        hasMoreDashboards = false;
      }
    }
  }
}
