-- CreateTable
CREATE TABLE "PaymentAttempt" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "razorpayOrderId" TEXT NOT NULL,
    "razorpayPaymentId" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "customerName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "orderId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttempt_razorpayOrderId_key" ON "PaymentAttempt"("razorpayOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttempt_razorpayPaymentId_key" ON "PaymentAttempt"("razorpayPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttempt_orderId_key" ON "PaymentAttempt"("orderId");

-- CreateIndex
CREATE INDEX "PaymentAttempt_userId_status_idx" ON "PaymentAttempt"("userId", "status");

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
