import { z } from "zod";
import { AssetSchema, DoorSegmentSchema } from "./interactive";

const Vec2 = z.tuple([z.number(), z.number()]);
const Vec3 = z.tuple([z.number(), z.number(), z.number()]);
const Polygon2D = z.array(Vec2);

const CameraStateSchema = z.object({
  position: Vec3,
  target: Vec3,
  mode: z.enum(["perspective", "orthographic"]),
  fov: z.number().optional(),
  zoom: z.number().optional(),
});

const WallSide = z.enum(["interior", "exterior", "unknown"]);
const ItemSide = z.enum(["front", "back"]);
const HingesSide = z.enum(["left", "right"]);
const SwingDirection = z.enum(["inward", "outward"]);

const SpatialNodeType = z.enum([
  "site",
  "building",
  "level",
  "wall",
  "item",
  "zone",
  "slab",
  "ceiling",
  "roof",
  "scan",
  "guide",
  "window",
  "door",
]);

const BaseNodeFields = {
  object: z.literal("node").default("node"),
  id: z.string(),
  name: z.string().optional(),
  parentId: z.string().nullable().default(null),
  visible: z.boolean().default(true),
  camera: CameraStateSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
};

export const SiteNodeSchema = z.object({
  ...BaseNodeFields,
  type: z.literal("site").default("site"),
  polygon: z
    .object({
      type: z.literal("polygon"),
      points: Polygon2D,
    })
    .optional()
    .default({
      type: "polygon",
      points: [
        [-15, -15],
        [15, -15],
        [15, 15],
        [-15, 15],
      ],
    }),
  children: z.array(z.string()).default([]),
});

export const BuildingNodeSchema = z.object({
  ...BaseNodeFields,
  type: z.literal("building").default("building"),
  position: Vec3.default([0, 0, 0]),
  rotation: Vec3.default([0, 0, 0]),
  children: z.array(z.string()).default([]),
});

export const LevelNodeSchema = z.object({
  ...BaseNodeFields,
  type: z.literal("level").default("level"),
  level: z.number().default(0),
  children: z.array(z.string()).default([]),
});

export const WallNodeSchema = z.object({
  ...BaseNodeFields,
  type: z.literal("wall").default("wall"),
  start: Vec2,
  end: Vec2,
  thickness: z.number().optional(),
  height: z.number().optional(),
  children: z.array(z.string()).default([]),
  frontSide: WallSide.default("unknown"),
  backSide: WallSide.default("unknown"),
});

export const ItemNodeSchema = z.object({
  ...BaseNodeFields,
  type: z.literal("item").default("item"),
  position: Vec3.default([0, 0, 0]),
  rotation: Vec3.default([0, 0, 0]),
  scale: Vec3.default([1, 1, 1]),
  side: ItemSide.optional(),
  children: z.array(z.string()).default([]),
  wallId: z.string().optional(),
  wallT: z.number().optional(),
  collectionIds: z.array(z.string()).optional(),
  asset: AssetSchema,
});

export const ZoneNodeSchema = z.object({
  ...BaseNodeFields,
  type: z.literal("zone").default("zone"),
  name: z.string(),
  polygon: Polygon2D,
  color: z.string().default("#3b82f6"),
});

export const SlabNodeSchema = z.object({
  ...BaseNodeFields,
  type: z.literal("slab").default("slab"),
  polygon: Polygon2D,
  holes: z.array(Polygon2D).default([]),
  elevation: z.number().default(0.05),
});

export const CeilingNodeSchema = z.object({
  ...BaseNodeFields,
  type: z.literal("ceiling").default("ceiling"),
  polygon: Polygon2D,
  holes: z.array(Polygon2D).default([]),
  height: z.number().default(2.5),
  children: z.array(z.string()).default([]),
});

export const RoofNodeSchema = z.object({
  ...BaseNodeFields,
  type: z.literal("roof").default("roof"),
  position: Vec3.default([0, 0, 0]),
  rotation: z.number().default(0),
  length: z.number().default(4),
  height: z.number().default(1.5),
  leftWidth: z.number().default(1.5),
  rightWidth: z.number().default(1.5),
});

export const ScanNodeSchema = z.object({
  ...BaseNodeFields,
  type: z.literal("scan").default("scan"),
  url: z.string(),
  position: Vec3.default([0, 0, 0]),
  rotation: Vec3.default([0, 0, 0]),
  scale: z.number().default(1),
  opacity: z.number().min(0).max(100).default(100),
});

export const GuideNodeSchema = z.object({
  ...BaseNodeFields,
  type: z.literal("guide").default("guide"),
  url: z.string(),
  position: Vec3.default([0, 0, 0]),
  rotation: Vec3.default([0, 0, 0]),
  scale: z.number().default(1),
  opacity: z.number().min(0).max(100).default(50),
});

export const WindowNodeSchema = z.object({
  ...BaseNodeFields,
  type: z.literal("window").default("window"),
  position: Vec3.default([0, 0, 0]),
  rotation: Vec3.default([0, 0, 0]),
  side: ItemSide.optional(),
  wallId: z.string().optional(),
  width: z.number().default(1.5),
  height: z.number().default(1.5),
  frameThickness: z.number().default(0.05),
  frameDepth: z.number().default(0.07),
  columnRatios: z.array(z.number()).default([1]),
  rowRatios: z.array(z.number()).default([1]),
  columnDividerThickness: z.number().default(0.03),
  rowDividerThickness: z.number().default(0.03),
  sill: z.boolean().default(true),
  sillDepth: z.number().default(0.08),
  sillThickness: z.number().default(0.03),
});

export const DoorNodeSchema = z.object({
  ...BaseNodeFields,
  type: z.literal("door").default("door"),
  position: Vec3.default([0, 0, 0]),
  rotation: Vec3.default([0, 0, 0]),
  side: ItemSide.optional(),
  wallId: z.string().optional(),
  width: z.number().default(0.9),
  height: z.number().default(2.1),
  frameThickness: z.number().default(0.05),
  frameDepth: z.number().default(0.07),
  threshold: z.boolean().default(true),
  thresholdHeight: z.number().default(0.02),
  hingesSide: HingesSide.default("left"),
  swingDirection: SwingDirection.default("inward"),
  segments: z.array(DoorSegmentSchema).default([
    {
      type: "panel",
      heightRatio: 0.4,
      columnRatios: [1],
      dividerThickness: 0.03,
      panelDepth: 0.01,
      panelInset: 0.04,
    },
    {
      type: "panel",
      heightRatio: 0.6,
      columnRatios: [1],
      dividerThickness: 0.03,
      panelDepth: 0.01,
      panelInset: 0.04,
    },
  ]),
  handle: z.boolean().default(true),
  handleHeight: z.number().default(1.05),
  handleSide: HingesSide.default("right"),
  contentPadding: Vec2.default([0.04, 0.04]),
  doorCloser: z.boolean().default(false),
  panicBar: z.boolean().default(false),
  panicBarHeight: z.number().default(1.0),
});

export const AnyNodeSchema = z.discriminatedUnion("type", [
  SiteNodeSchema,
  BuildingNodeSchema,
  LevelNodeSchema,
  WallNodeSchema,
  ItemNodeSchema,
  ZoneNodeSchema,
  SlabNodeSchema,
  CeilingNodeSchema,
  RoofNodeSchema,
  ScanNodeSchema,
  GuideNodeSchema,
  WindowNodeSchema,
  DoorNodeSchema,
]);

export type SiteNode = z.infer<typeof SiteNodeSchema>;
export type BuildingNode = z.infer<typeof BuildingNodeSchema>;
export type LevelNode = z.infer<typeof LevelNodeSchema>;
export type WallNode = z.infer<typeof WallNodeSchema>;
export type ItemNode = z.infer<typeof ItemNodeSchema>;
export type ZoneNode = z.infer<typeof ZoneNodeSchema>;
export type SlabNode = z.infer<typeof SlabNodeSchema>;
export type CeilingNode = z.infer<typeof CeilingNodeSchema>;
export type RoofNode = z.infer<typeof RoofNodeSchema>;
export type ScanNode = z.infer<typeof ScanNodeSchema>;
export type GuideNode = z.infer<typeof GuideNodeSchema>;
export type WindowNode = z.infer<typeof WindowNodeSchema>;
export type DoorNode = z.infer<typeof DoorNodeSchema>;
export type AnyNode = z.infer<typeof AnyNodeSchema>;
export type AnyNodeType = z.infer<typeof SpatialNodeType>;
export type CameraState = z.infer<typeof CameraStateSchema>;

export { SpatialNodeType, CameraStateSchema };
