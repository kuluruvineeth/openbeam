-- AddForeignKey
ALTER TABLE "context_memory_extraction" ADD CONSTRAINT "context_memory_extraction_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "team"("_id") ON DELETE CASCADE ON UPDATE CASCADE;
