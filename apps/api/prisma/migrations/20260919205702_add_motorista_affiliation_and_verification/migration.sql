-- AlterTable
ALTER TABLE "motoristas" ADD COLUMN     "affiliation" TEXT,
ADD COLUMN     "documentsVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "documentsVerifiedById" TEXT;

-- AddForeignKey
ALTER TABLE "motoristas" ADD CONSTRAINT "motoristas_documentsVerifiedById_fkey" FOREIGN KEY ("documentsVerifiedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
