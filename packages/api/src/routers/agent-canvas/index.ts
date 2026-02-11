import { createTRPCRouter } from "../../index";
import { builderProcedures } from "./builder";
import { canvasCrudProcedures } from "./canvas-crud";
import { executionProcedures } from "./executions";
import { interactionProcedures } from "./interactions";
import { sessionProcedures } from "./sessions";

export const agentCanvasRouter = createTRPCRouter({
  ...canvasCrudProcedures,
  ...executionProcedures,
  ...interactionProcedures,
  ...sessionProcedures,
  ...builderProcedures,
});
