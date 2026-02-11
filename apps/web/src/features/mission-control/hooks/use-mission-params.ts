"use client";

import { parseAsBoolean, parseAsString, useQueryState } from "nuqs";

export function useMissionParams() {
  const [create, setCreate] = useQueryState(
    "create",
    parseAsBoolean.withDefault(false)
  );
  const [templateId, setTemplateId] = useQueryState(
    "templateId",
    parseAsString
  );
  const [cloneId, setCloneId] = useQueryState("cloneId", parseAsString);

  return { create, setCreate, templateId, setTemplateId, cloneId, setCloneId };
}
