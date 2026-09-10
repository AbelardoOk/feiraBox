/*
  Warnings:

  - Made the column `businessName` on table `VendorProfile` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Fair" ADD COLUMN     "ownerId" TEXT;

-- AlterTable
ALTER TABLE "SurpriseBox" ADD COLUMN     "photoUrl" TEXT;

-- AlterTable
ALTER TABLE "VendorProfile" ADD COLUMN     "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "businessName" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Fair_ownerId_idx" ON "Fair"("ownerId");

-- AddForeignKey
ALTER TABLE "Fair" ADD CONSTRAINT "Fair_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
