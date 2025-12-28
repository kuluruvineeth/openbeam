-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('PERSON', 'TEAM', 'PROJECT', 'TOPIC', 'TECHNOLOGY', 'LOCATION', 'ORGANIZATION', 'CHANNEL', 'REPOSITORY');

-- CreateEnum
CREATE TYPE "RelationType" AS ENUM ('MEMBER_OF', 'REPORTS_TO', 'COLLABORATES_WITH', 'MENTIONS', 'EXPERT_IN', 'AUTHORED', 'MAINTAINS', 'OWNS', 'USES', 'RELATES_TO', 'CHILD_OF');

-- CreateTable
CREATE TABLE "entity" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "type" "EntityType" NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "description" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "embedding" BYTEA,
    "imageUrl" TEXT,
    "externalId" TEXT,
    "externalSource" TEXT,
    "expertiseScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "documentCount" INTEGER NOT NULL DEFAULT 0,
    "mentionCount" INTEGER NOT NULL DEFAULT 0,
    "lastActiveAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entity_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "entity_relation" (
    "_id" TEXT NOT NULL,
    "fromEntityId" TEXT NOT NULL,
    "toEntityId" TEXT NOT NULL,
    "relationType" "RelationType" NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "evidence" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entity_relation_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "entity_mention" (
    "_id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "mentionText" TEXT NOT NULL,
    "context" TEXT,
    "startOffset" INTEGER,
    "endOffset" INTEGER,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entity_mention_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "topic_cluster" (
    "_id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,
    "embedding" BYTEA,
    "documentCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "topic_cluster_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE INDEX "entity_teamId_type_idx" ON "entity"("teamId", "type");

-- CreateIndex
CREATE INDEX "entity_teamId_normalizedName_idx" ON "entity"("teamId", "normalizedName");

-- CreateIndex
CREATE INDEX "entity_teamId_expertiseScore_idx" ON "entity"("teamId", "expertiseScore" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "entity_teamId_type_normalizedName_key" ON "entity"("teamId", "type", "normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "entity_teamId_externalSource_externalId_key" ON "entity"("teamId", "externalSource", "externalId");

-- CreateIndex
CREATE INDEX "entity_relation_fromEntityId_idx" ON "entity_relation"("fromEntityId");

-- CreateIndex
CREATE INDEX "entity_relation_toEntityId_idx" ON "entity_relation"("toEntityId");

-- CreateIndex
CREATE INDEX "entity_relation_relationType_idx" ON "entity_relation"("relationType");

-- CreateIndex
CREATE UNIQUE INDEX "entity_relation_fromEntityId_toEntityId_relationType_key" ON "entity_relation"("fromEntityId", "toEntityId", "relationType");

-- CreateIndex
CREATE INDEX "entity_mention_entityId_idx" ON "entity_mention"("entityId");

-- CreateIndex
CREATE INDEX "entity_mention_documentId_idx" ON "entity_mention"("documentId");

-- CreateIndex
CREATE INDEX "entity_mention_teamId_documentId_idx" ON "entity_mention"("teamId", "documentId");

-- CreateIndex
CREATE INDEX "topic_cluster_teamId_idx" ON "topic_cluster"("teamId");

-- CreateIndex
CREATE INDEX "topic_cluster_parentId_idx" ON "topic_cluster"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "topic_cluster_teamId_name_key" ON "topic_cluster"("teamId", "name");

-- AddForeignKey
ALTER TABLE "entity" ADD CONSTRAINT "entity_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_relation" ADD CONSTRAINT "entity_relation_fromEntityId_fkey" FOREIGN KEY ("fromEntityId") REFERENCES "entity"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_relation" ADD CONSTRAINT "entity_relation_toEntityId_fkey" FOREIGN KEY ("toEntityId") REFERENCES "entity"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_mention" ADD CONSTRAINT "entity_mention_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entity"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_cluster" ADD CONSTRAINT "topic_cluster_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "topic_cluster"("_id") ON DELETE SET NULL ON UPDATE CASCADE;
