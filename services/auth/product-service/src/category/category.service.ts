import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
  private readonly logger = new Logger(CategoryService.name);

  constructor(private prisma: PrismaService) {}

  async createCategory(createCategoryDto: CreateCategoryDto) {
    const category = await this.prisma.category.create({
      data: {
        name: createCategoryDto.name,
        slug: createCategoryDto.slug,
        parentId: createCategoryDto.parentId,
      },
      include: {
        parent: true,
        subCategories: true,
      },
    });

    this.logger.log(`Category created: ${category.id}`);
    return category;
  }

  async getCategories() {
    return this.prisma.category.findMany({
      include: {
        parent: true,
        subCategories: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async getCategoryById(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        subCategories: true,
        productCategories: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category ${id} not found`);
    }

    return category;
  }

  async updateCategory(id: string, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Category ${id} not found`);
    }

    const updated = await this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
      include: {
        parent: true,
        subCategories: true,
      },
    });

    this.logger.log(`Category updated: ${id}`);
    return updated;
  }

  async deleteCategory(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Category ${id} not found`);
    }

    await this.prisma.category.delete({
      where: { id },
    });

    this.logger.log(`Category deleted: ${id}`);
    return { message: 'Category deleted successfully' };
  }
}
