
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const products = [
  {
    name: 'Floral Cotton Kurti',
    description: 'Lightweight cotton kurti with a delicate floral print.',
    price: 799,
    imageUrl: '/images/floral-cotton-kurti.jpg',
    category: 'Kurtis',
    stock: 15,
  },
  {
    name: 'Elegant Anarkali Suit',
    description: 'A graceful Anarkali suit for festive occasions.',
    price: 1899,
    imageUrl: '/images/anarkali-suit.jpg',
    category: 'Ethnic Wear',
    stock: 8,
  },
  {
    name: 'Pastel Chiffon Saree',
    description: 'A soft pastel saree with a subtle decorative border.',
    price: 1499,
    imageUrl: '/images/pink-saree.jpg',
    category: 'Sarees',
    stock: 10,
  },
  {
    name: 'Everyday Straight Pants',
    description: 'Comfortable straight-fit pants for everyday wear.',
    price: 599,
    imageUrl: '/images/printed-kurta-set.jpg',
    category: 'Bottoms',
    stock: 20,
  },
  {
    name: 'Embroidered Festive Dupatta',
    description: 'An embroidered dupatta to elevate ethnic outfits.',
    price: 699,
    imageUrl: '/images/embroidered-festive-suit.jpg',
    category: 'Accessories',
    stock: 12,
  },
  {
    name: 'Classic Co-ord Set',
    description: 'A stylish two-piece outfit for casual outings.',
    price: 1299,
    imageUrl: '/images/sage-coord-set.jpg',
    category: 'Western Wear',
    stock: 7,
  },
];

async function main() {
  for (const product of products) {
    const existing = await prisma.product.findFirst({
      where: { name: product.name },
    });

    if (existing) {
      await prisma.product.update({
        where: { id: existing.id },
        data: product,
      });
    } else {
      await prisma.product.create({
        data: product,
      });
    }
  }

  console.log('6 sample products added or updated!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
