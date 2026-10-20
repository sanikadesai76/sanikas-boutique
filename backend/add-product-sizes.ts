
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// TEST DATA ONLY: replace these quantities with your actual stock.
const productSizes: Record<string, number> = {
  kurti: 5,
  anarkali: 5,
  pants: 5,
  coord: 5,
};

const sizesByProductId: Record<number, string[]> = {
  1: ['S', 'M', 'L', 'XL', 'XXL'],
  2: ['S', 'M', 'L', 'XL', 'XXL'],
  3: ['Free Size'],
  4: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  5: ['Free Size'],
  6: ['S', 'M', 'L', 'XL', 'XXL'],
};

async function main() {
  for (const [productIdText, sizes] of Object.entries(sizesByProductId)) {
    const productId = Number(productIdText);

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      console.log(`Product ID ${productId} not found; skipping.`);
      continue;
    }

    for (const size of sizes) {
      await prisma.productVariant.upsert({
        where: {
          productId_size: {
            productId,
            size,
          },
        },
        create: {
          productId,
          size,
          stock: 5,
        },
        update: {},
      });
    }

    console.log(`Added or verified sizes for: ${product.name}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
