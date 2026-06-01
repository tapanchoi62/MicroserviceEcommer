import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateVariantDto } from './dto/create-variant.dto';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(private prisma: PrismaService) {}

  async createProduct(createProductDto: CreateProductDto) {
    const { categoryIds, ...productData } = createProductDto;

    const product = await this.prisma.product.create({
      data: {
        ...productData,
        status: productData.status || 'draft',
        productCategories: categoryIds
          ? {
              createMany: {
                data: categoryIds.map((categoryId) => ({
                  categoryId,
                })),
              },
            }
          : undefined,
      },
      include: {
        brand: true,
        productCategories: {
          include: {
            category: true,
          },
        },
        variants: {
          include: {
            variantAttributes: true,
          },
        },
        images: true,
        attributes: true,
      },
    });

    this.logger.log(`Product created: ${product.id}`);
    return product;
  }

  async getProducts(page = 1, pageSize = 20, filters?: any) {
    const skip = (page - 1) * pageSize;

    const where: any = {
      deletedAt: null,
    };

    if (filters?.keyword) {
      where.OR = [
        { name: { contains: filters.keyword, mode: 'insensitive' } },
        { description: { contains: filters.keyword, mode: 'insensitive' } },
      ];
    }

    if (filters?.brandId) {
      where.brandId = filters.brandId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.categoryId) {
      where.productCategories = {
        some: {
          categoryId: filters.categoryId,
        },
      };
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          brand: true,
          productCategories: {
            include: {
              category: true,
            },
          },
          variants: {
            include: {
              variantAttributes: true,
            },
          },
          images: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getProductById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        brand: true,
        productCategories: {
          include: {
            category: true,
          },
        },
        variants: {
          include: {
            variantAttributes: true,
          },
        },
        images: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
        attributes: true,
      },
    });

    if (!product || product.deletedAt) {
      throw new NotFoundException(`Product ${id} not found`);
    }

    return product;
  }

  async updateProduct(id: string, updateProductDto: UpdateProductDto) {
    const { categoryIds, ...productData } = updateProductDto;

    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        ...productData,
        productCategories: categoryIds
          ? {
              deleteMany: {},
              createMany: {
                data: categoryIds.map((categoryId) => ({
                  categoryId,
                })),
              },
            }
          : undefined,
      },
      include: {
        brand: true,
        productCategories: {
          include: {
            category: true,
          },
        },
        variants: {
          include: {
            variantAttributes: true,
          },
        },
        images: true,
        attributes: true,
      },
    });

    this.logger.log(`Product updated: ${id}`);
    return updated;
  }

  async deleteProduct(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }

    const deleted = await this.prisma.product.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    this.logger.log(`Product soft deleted: ${id}`);
    return deleted;
  }

  async addVariant(productId: string, createVariantDto: CreateVariantDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product ${productId} not found`);
    }

    const variant = await this.prisma.productVariant.create({
      data: {
        productId,
        sku: createVariantDto.sku,
        barcode: createVariantDto.barcode,
        price: createVariantDto.price,
        comparePrice: createVariantDto.comparePrice,
        weight: createVariantDto.weight,
        isDefault: createVariantDto.isDefault || false,
        variantAttributes: createVariantDto.attributes
          ? {
              createMany: {
                data: createVariantDto.attributes.map((attr) => ({
                  attributeName: attr.name,
                  attributeValue: attr.value,
                })),
              },
            }
          : undefined,
      },
      include: {
        variantAttributes: true,
      },
    });

    this.logger.log(`Variant added to product ${productId}: ${variant.id}`);
    return variant;
  }

  async addImage(productId: string, imageUrl: string, isThumbnail = false) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product ${productId} not found`);
    }

    const image = await this.prisma.productImage.create({
      data: {
        productId,
        imageUrl,
        isThumbnail,
      },
    });

    this.logger.log(`Image added to product ${productId}: ${image.id}`);
    return image;
  }
}
