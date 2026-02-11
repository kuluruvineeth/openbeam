import { aiNodeTypes } from "./ai";
import { controlNodeTypes } from "./control";
import { DropNode } from "./drop-node";
import { GroupNode } from "./group-node";
import { humanNodeTypes } from "./human";
import { integrationNodeTypes } from "./integration";
import { memoryNodeTypes } from "./memory";
import { orchestrationNodeTypes } from "./orchestration";
import { transformNodeTypes } from "./transform";
import { triggerNodeTypes } from "./trigger";

export function createAllNodeTypes() {
  return {
    ...controlNodeTypes,
    ...aiNodeTypes,
    ...transformNodeTypes,
    ...humanNodeTypes,
    ...integrationNodeTypes,
    ...triggerNodeTypes,
    ...memoryNodeTypes,
    ...orchestrationNodeTypes,
    drop: DropNode,
    group: GroupNode,
  } as const;
}
