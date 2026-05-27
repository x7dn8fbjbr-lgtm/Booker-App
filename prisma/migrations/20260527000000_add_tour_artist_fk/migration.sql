-- AddForeignKey
ALTER TABLE "Tour" ADD CONSTRAINT "Tour_artistId_fkey"
  FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Tour_artistId_idx" ON "Tour"("artistId");
