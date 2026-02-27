import { z } from "zod";

const EmptyParamsSchema = z.object({}).strict();

const SuccessResultSchema = z
  .object({
    success: z.boolean(),
  })
  .strict();

const CanonicalAccessibilityStatusResultSchema = z
  .object({
    granted: z.boolean(),
    promptable: z.boolean().optional(),
    detail: z.string().optional(),
  })
  .strict();

const LegacyAccessibilityStatusResultSchema = z
  .object({
    hasPermission: z.boolean(),
    isEnabled: z.boolean(),
  })
  .strict();

const AccessibilityStatusResultSchema = z
  .union([
    CanonicalAccessibilityStatusResultSchema,
    LegacyAccessibilityStatusResultSchema,
  ])
  .transform((result) => {
    if ("hasPermission" in result) {
      const hasPermission = result.hasPermission === true;
      const isEnabled = result.isEnabled === true;
      return {
        granted: hasPermission,
        promptable: hasPermission ? undefined : isEnabled,
      };
    }

    return result;
  });

const RequestAccessibilityPermissionResultSchema = z
  .object({
    granted: z.boolean(),
    openedSystemSettings: z.boolean().optional(),
  })
  .strict();

const GetAccessibilityContextParamsSchema = z
  .object({
    editableOnly: z.boolean().optional(),
  })
  .strict();

const GetAccessibilityContextResultSchema = z
  .object({
    context: z.record(z.string(), z.unknown()).nullable().optional(),
  })
  .strict();

const GetAccessibilityTreeDetailsParamsSchema = z
  .object({
    includeChildren: z.boolean().optional(),
  })
  .strict();

const GetAccessibilityTreeDetailsResultSchema = z
  .object({
    details: z.record(z.string(), z.unknown()).nullable().optional(),
  })
  .strict();

const PasteTextParamsSchema = z
  .union([
    z
      .object({
        transcript: z.string(),
      })
      .strict(),
    z
      .object({
        text: z.string(),
      })
      .strict(),
  ])
  .transform((params) =>
    "transcript" in params ? params : { transcript: params.text }
  );

const SetShortcutsParamsSchema = z
  .object({
    pushToTalk: z.array(z.number().int()),
    toggleRecording: z.array(z.number().int()),
    pasteLastTranscript: z.array(z.number().int()),
    newNote: z.array(z.number().int()),
  })
  .strict();

const RecheckPressedKeysParamsSchema = z
  .object({
    pressedKeyCodes: z.array(z.number().int()),
  })
  .strict();

const RecheckPressedKeysResultSchema = z
  .object({
    staleKeyCodes: z.array(z.number().int()),
  })
  .strict();

function parseEventTimestampMs(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.floor(value);
  }
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return Math.floor(parsed);
    }
  }
  return;
}

const KeyEventPayloadSchema = z
  .object({
    keyCode: z.number().int(),
    key: z.string().optional(),
    code: z.string().optional(),
    altKey: z.boolean().optional(),
    ctrlKey: z.boolean().optional(),
    shiftKey: z.boolean().optional(),
    metaKey: z.boolean().optional(),
    fnKeyPressed: z.boolean().optional(),
    timestampMs: z.number().int().nonnegative().optional(),
  })
  .strict();

const ErrorEventPayloadSchema = z
  .object({
    code: z.string().optional(),
    message: z.string(),
  })
  .strict();

export const NativeHelperEventSchema = z.preprocess(
  (input) => {
    if (!input || typeof input !== "object") {
      return input;
    }

    const event = input as Record<string, unknown>;
    const type = event.type;
    if (type !== "keyDown" && type !== "keyUp") {
      return input;
    }

    if (!event.payload || typeof event.payload !== "object") {
      return input;
    }

    const payload = event.payload as Record<string, unknown>;
    const timestampMs =
      parseEventTimestampMs(payload.timestampMs) ??
      parseEventTimestampMs(event.timestamp);
    const { timestamp: _ignoredTimestamp, ...rest } = event;
    return timestampMs === undefined
      ? rest
      : {
          ...rest,
          payload: {
            ...payload,
            timestampMs,
          },
        };
  },
  z.discriminatedUnion("type", [
    z
      .object({
        type: z.literal("keyDown"),
        payload: KeyEventPayloadSchema,
      })
      .strict(),
    z
      .object({
        type: z.literal("keyUp"),
        payload: KeyEventPayloadSchema,
      })
      .strict(),
    z
      .object({
        type: z.literal("error"),
        payload: ErrorEventPayloadSchema,
      })
      .strict(),
  ])
);

export type NativeHelperEvent = z.infer<typeof NativeHelperEventSchema>;

export const NativeHelperMethodSchemas = {
  getAccessibilityStatus: {
    params: EmptyParamsSchema,
    result: AccessibilityStatusResultSchema,
  },
  requestAccessibilityPermission: {
    params: EmptyParamsSchema,
    result: RequestAccessibilityPermissionResultSchema,
  },
  getAccessibilityContext: {
    params: GetAccessibilityContextParamsSchema,
    result: GetAccessibilityContextResultSchema,
  },
  getAccessibilityTreeDetails: {
    params: GetAccessibilityTreeDetailsParamsSchema,
    result: GetAccessibilityTreeDetailsResultSchema,
  },
  pasteText: {
    params: PasteTextParamsSchema,
    result: SuccessResultSchema,
  },
  muteSystemAudio: {
    params: EmptyParamsSchema,
    result: SuccessResultSchema,
  },
  restoreSystemAudio: {
    params: EmptyParamsSchema,
    result: SuccessResultSchema,
  },
  setShortcuts: {
    params: SetShortcutsParamsSchema,
    result: SuccessResultSchema,
  },
  recheckPressedKeys: {
    params: RecheckPressedKeysParamsSchema,
    result: RecheckPressedKeysResultSchema,
  },
} as const;

export type NativeHelperRpcMethod = keyof typeof NativeHelperMethodSchemas;

type NativeHelperMethodSchemaRecord = typeof NativeHelperMethodSchemas;

export type NativeHelperMethodParams<M extends NativeHelperRpcMethod> = z.input<
  NativeHelperMethodSchemaRecord[M]["params"]
>;

export type NativeHelperMethodResult<M extends NativeHelperRpcMethod> =
  z.output<NativeHelperMethodSchemaRecord[M]["result"]>;
