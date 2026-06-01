import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  const brand1 = await prisma.brand.upsert({
    where: { slug: 'apple' },
    update: {},
    create: {
      name: 'Apple',
      slug: 'apple',
      logoUrl: 'https://example.com/apple-logo.png',
    },
  });

  const brand2 = await prisma.brand.upsert({
    where: { slug: 'samsung' },
    update: {},
    create: {
      name: 'Samsung',
      slug: 'samsung',
      logoUrl: 'https://example.com/samsung-logo.png',
    },
  });

  const category1 = await prisma.category.upsert({
    where: { slug: 'electronics' },
    update: {},
    create: {
      name: 'Electronics',
      slug: 'electronics',
    },
  });

  const category2 = await prisma.category.upsert({
    where: { slug: 'smartphones' },
    update: {},
    create: {
      name: 'Smartphones',
      slug: 'smartphones',
      parentId: category1.id,
    },
  });

  const product1 = await prisma.product.upsert({
    where: { slug: 'iphone-15-pro' },
    update: {},
    create: {
      name: 'iPhone 15 Pro',
      slug: 'iphone-15-pro',
      description: 'Latest iPhone model with advanced features',
      brandId: brand1.id,
      status: 'active',
      seoTitle: 'iPhone 15 Pro - Latest Apple Smartphone',
      seoDescription: 'Buy iPhone 15 Pro online',
      productCategories: {
        create: [
          { categoryId: category1.id },
          { categoryId: category2.id },
        ],
      },
    },
  });

  const variant1 = await prisma.productVariant.create({
    data: {
      productId: product1.id,
      sku: 'IPHONE15PRO-256GB',
      barcode: '123456789',
      price: '999.99',
      isDefault: true,
      variantAttributes: {
        create: [
          { attributeName: 'Storage', attributeValue: '256GB' },
          { attributeName: 'Color', attributeValue: 'Black' },
        ],
      },
    },
  });

  await prisma.productImage.create({
    data: {
      productId: product1.id,
      imageUrl: 'https://example.com/iphone-15-pro.jpg',
      isThumbnail: true,
      sortOrder: 0,
    },
  });

  console.log('Seed completed successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
