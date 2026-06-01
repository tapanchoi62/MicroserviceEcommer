import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateVariantDto } from './dto/create-variant.dto';

@ApiTags('Products')
@Controller('products')
export class ProductController {
  constructor(private productService: ProductService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new product' })
  async createProduct(@Body() createProductDto: CreateProductDto) {
    return this.productService.createProduct(createProductDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all products with pagination and filters' })
  async getProducts(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20',
    @Query('keyword') keyword?: string,
    @Query('brandId') brandId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('status') status?: string,
  ) {
    return this.productService.getProducts(parseInt(page), parseInt(pageSize), {
      keyword,
      brandId,
      categoryId,
      status,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  async getProductById(@Param('id') id: string) {
    return this.productService.getProductById(id);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update product' })
  async updateProduct(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productService.updateProduct(id, updateProductDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete product (soft delete)' })
  async deleteProduct(@Param('id') id: string) {
    return this.productService.deleteProduct(id);
  }

  @Post(':id/variants')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add variant to product' })
  async addVariant(
    @Param('id') productId: string,
    @Body() createVariantDto: CreateVariantDto,
  ) {
    return this.productService.addVariant(productId, createVariantDto);
  }

  @Post(':id/images')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add image to product' })
  async addImage(
    @Param('id') productId: string,
    @Body('imageUrl') imageUrl: string,
    @Body('isThumbnail') isThumbnail?: boolean,
  ) {
    return this.productService.addImage(productId, imageUrl, isThumbnail);
  }
}
