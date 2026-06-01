'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { productApi, Product } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<string>('');

  useEffect(() => {
    const loadProduct = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await productApi.getProductById(productId);
        setProduct(data);
        if (data.variants?.[0]) {
          setSelectedVariant(data.variants[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load product');
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      loadProduct();
    }
  }, [productId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <p className="text-center text-gray-600">Loading product...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <Alert className="bg-red-50 text-red-700 mb-4">
            {error || 'Product not found'}
          </Alert>
          <Button onClick={() => router.back()} variant="outline">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const currentVariant = product.variants?.find((v) => v.id === selectedVariant);
  const defaultVariant = product.variants?.find((v) => v.isDefault);
  const variant = currentVariant || defaultVariant || product.variants?.[0];
  const price = variant?.price || 'N/A';
  const thumbnailImage = product.images?.find((img) => img.isThumbnail);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <Button onClick={() => router.back()} variant="outline" className="mb-6">
          ← Back
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Images */}
          <div className="space-y-4">
            {thumbnailImage && (
              <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                <Image
                  src={thumbnailImage.imageUrl}
                  alt={product.name}
                  fill
                  className="object-cover"
                  onError={(e) => {
                    e.currentTarget.src = 'https://via.placeholder.com/500x500?text=No+Image';
                  }}
                />
              </div>
            )}
            {product.images && product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {product.images.map((image) => (
                  <div
                    key={image.id}
                    className="relative aspect-square bg-gray-100 rounded overflow-hidden cursor-pointer"
                  >
                    <Image
                      src={image.imageUrl}
                      alt={product.name}
                      fill
                      className="object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'https://via.placeholder.com/150x150?text=No+Image';
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">{product.name}</h1>
              <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                {product.status}
              </Badge>
            </div>

            {product.brand && (
              <div>
                <p className="text-sm text-gray-600">Brand</p>
                <p className="text-lg font-semibold">{product.brand.name}</p>
              </div>
            )}

            {product.productCategories && product.productCategories.length > 0 && (
              <div>
                <p className="text-sm text-gray-600 mb-2">Categories</p>
                <div className="flex gap-2 flex-wrap">
                  {product.productCategories.map((pc) => (
                    <Badge key={pc.categoryId} variant="outline">
                      {pc.category.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-sm text-gray-600">Description</p>
              <p className="text-gray-700 mt-2">{product.description}</p>
            </div>

            {/* Variants */}
            {product.variants && product.variants.length > 1 && (
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-3">Options</p>
                <div className="space-y-3">
                  {product.variants.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(v.id)}
                      className={`w-full text-left p-3 border rounded-lg transition-colors ${
                        selectedVariant === v.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="font-semibold">{v.sku}</div>
                      <div className="text-sm text-gray-600">
                        {v.variantAttributes
                          ?.map((attr) => `${attr.attributeName}: ${attr.attributeValue}`)
                          .join(' • ')}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Price and Action */}
            <Card className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600">Price</p>
                <p className="text-4xl font-bold text-blue-600">${price}</p>
              </div>
              {variant?.comparePrice && (
                <div>
                  <p className="text-sm text-gray-600">Compare at</p>
                  <p className="text-lg text-gray-500 line-through">${variant.comparePrice}</p>
                </div>
              )}
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg text-lg">
                Add to Cart
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
