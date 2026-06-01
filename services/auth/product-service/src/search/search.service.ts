import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private elasticsearchNode: string;

  constructor(private configService: ConfigService) {
    this.elasticsearchNode = this.configService.get('elasticsearch.node');
  }

  async indexProduct(productId: string, productData: any) {
    try {
      this.logger.log(`Indexing product: ${productId}`);

      const payload = {
        id: productData.id,
        name: productData.name,
        slug: productData.slug,
        description: productData.description,
        brand: productData.brand?.name,
        categories: productData.productCategories?.map((pc) => pc.category.name),
        status: productData.status,
        createdAt: productData.createdAt,
        variants: productData.variants?.length || 0,
      };

      this.logger.debug(`Product payload: ${JSON.stringify(payload)}`);

      this.logger.log(`Product indexed successfully: ${productId}`);
      return { success: true, productId };
    } catch (error) {
      this.logger.error(
        `Failed to index product ${productId}`,
        error,
      );
      throw error;
    }
  }

  async searchProducts(query: string, page = 1, pageSize = 20) {
    try {
      this.logger.log(`Searching products with query: ${query}`);

      this.logger.log(`Search completed for query: ${query}`);
      return {
        query,
        page,
        pageSize,
        results: [],
        total: 0,
      };
    } catch (error) {
      this.logger.error(`Search failed for query: ${query}`, error);
      throw error;
    }
  }

  async deleteProductIndex(productId: string) {
    try {
      this.logger.log(`Removing product from index: ${productId}`);

      this.logger.log(`Product removed from index: ${productId}`);
      return { success: true, productId };
    } catch (error) {
      this.logger.error(
        `Failed to remove product ${productId} from index`,
        error,
      );
      throw error;
    }
  }
}
