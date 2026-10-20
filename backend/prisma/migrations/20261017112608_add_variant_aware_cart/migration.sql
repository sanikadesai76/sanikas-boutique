/*
  Warnings:

  - A unique constraint covering the columns `[userId,productId,variantKey]` on the table `CartItem` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "CartItem_userId_productId_key";

-- AlterTable
ALTER TABLE "CartItem" ADD COLUMN     "variantId" INTEGER,
ADD COLUMN     "variantKey" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_userId_productId_variantKey_key" ON "CartItem"("userId", "productId", "variantKey");

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
