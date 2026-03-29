-- CreateTable
CREATE TABLE "context_entry" (
    "_id" TEXT NOT NULL,
    "uri" TEXT NOT NULL,
    "parent_uri" TEXT,
    "team_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "owner_type" TEXT NOT NULL,
    "context_type" TEXT NOT NULL,
    "category" TEXT,
    "is_leaf" BOOLEAN NOT NULL DEFAULT true,
    "abstract_text" TEXT NOT NULL,
    "overview" TEXT,
    "content" TEXT,
    "active_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "context_entry_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "context_relation" (
    "_id" TEXT NOT NULL,
    "source_uri" TEXT NOT NULL,
    "target_uri" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "reason" TEXT,
    "relation_type" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "context_relation_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "context_session" (
    "_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "agent_id" TEXT,
    "total_tokens" INTEGER NOT NULL DEFAULT 0,
    "archive_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "context_session_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "context_session_message" (
    "_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parts" JSONB,
    "token_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "context_session_message_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "context_memory_extraction" (
    "_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "categories" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "context_memory_extraction_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "context_entry_team_id_uri_key" ON "context_entry"("team_id", "uri");

-- CreateIndex
CREATE INDEX "context_entry_team_id_context_type_idx" ON "context_entry"("team_id", "context_type");

-- CreateIndex
CREATE INDEX "context_entry_team_id_parent_uri_idx" ON "context_entry"("team_id", "parent_uri");

-- CreateIndex
CREATE INDEX "context_entry_team_id_owner_id_owner_type_idx" ON "context_entry"("team_id", "owner_id", "owner_type");

-- CreateIndex
CREATE INDEX "context_entry_team_id_active_count_idx" ON "context_entry"("team_id", "active_count" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "context_relation_team_id_source_uri_target_uri_key" ON "context_relation"("team_id", "source_uri", "target_uri");

-- CreateIndex
CREATE INDEX "context_relation_team_id_source_uri_idx" ON "context_relation"("team_id", "source_uri");

-- CreateIndex
CREATE INDEX "context_relation_team_id_target_uri_idx" ON "context_relation"("team_id", "target_uri");

-- CreateIndex
CREATE INDEX "context_session_team_id_user_id_idx" ON "context_session"("team_id", "user_id");

-- CreateIndex
CREATE INDEX "context_session_team_id_status_idx" ON "context_session"("team_id", "status");

-- CreateIndex
CREATE INDEX "context_session_message_session_id_created_at_idx" ON "context_session_message"("session_id", "created_at");

-- CreateIndex
CREATE INDEX "context_memory_extraction_team_id_status_idx" ON "context_memory_extraction"("team_id", "status");

-- AddForeignKey
ALTER TABLE "context_entry" ADD CONSTRAINT "context_entry_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "team"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "context_relation" ADD CONSTRAINT "context_relation_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "team"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "context_session" ADD CONSTRAINT "context_session_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "team"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "context_session_message" ADD CONSTRAINT "context_session_message_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "context_session"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "context_memory_extraction" ADD CONSTRAINT "context_memory_extraction_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "context_session"("_id") ON DELETE CASCADE ON UPDATE CASCADE;
