import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Injectable()
export class BrandService {
  private readonly logger = new Logger(BrandService.name);

  constructor(private prisma: PrismaService) {}

  async createBrand(createBrandDto: CreateBrandDto) {
    const brand = await this.prisma.brand.create({
      data: createBrandDto,
    });

    this.logger.log(`Brand created: ${brand.id}`);
    return brand;
  }

  async getBrands() {
    return this.prisma.brand.findMany({
      include: {
        products: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async getBrandById(id: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      include: {
        products: true,
      },
    });

    if (!brand) {
      throw new NotFoundException(`Brand ${id} not found`);
    }

    return brand;
  }

  async updateBrand(id: string, updateBrandDto: UpdateBrandDto) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
    });

    if (!brand) {
      throw new NotFoundException(`Brand ${id} not found`);
    }

    const updated = await this.prisma.brand.update({
      where: { id },
      data: updateBrandDto,
      include: {
        products: true,
      },
    });

    this.logger.log(`Brand updated: ${id}`);
    return updated;
  }

  async deleteBrand(id: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
    });

    if (!brand) {
      throw new NotFoundException(`Brand ${id} not found`);
    }

    await this.prisma.brand.delete({
      where: { id },
    });

    this.logger.log(`Brand deleted: ${id}`);
    return { message: 'Brand deleted successfully' };
  }
}
