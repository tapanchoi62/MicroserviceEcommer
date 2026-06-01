import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BrandService } from './brand.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@ApiTags('Brands')
@Controller('brands')
export class BrandController {
  constructor(private brandService: BrandService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new brand' })
  async createBrand(@Body() createBrandDto: CreateBrandDto) {
    return this.brandService.createBrand(createBrandDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all brands' })
  async getBrands() {
    return this.brandService.getBrands();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get brand by ID' })
  async getBrandById(@Param('id') id: string) {
    return this.brandService.getBrandById(id);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update brand' })
  async updateBrand(
    @Param('id') id: string,
    @Body() updateBrandDto: UpdateBrandDto,
  ) {
    return this.brandService.updateBrand(id, updateBrandDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete brand' })
  async deleteBrand(@Param('id') id: string) {
    return this.brandService.deleteBrand(id);
  }
}
