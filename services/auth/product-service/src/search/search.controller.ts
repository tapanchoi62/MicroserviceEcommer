import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SearchService } from './search.service';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private searchService: SearchService) {}

  @Get('products')
  @ApiOperation({ summary: 'Search products' })
  async searchProducts(
    @Query('q') query: string,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20',
  ) {
    return this.searchService.searchProducts(
      query,
      parseInt(page),
      parseInt(pageSize),
    );
  }
}
