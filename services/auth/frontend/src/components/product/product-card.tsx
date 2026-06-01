'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Product } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const defaultImage = product.images?.find((img) => img.isThumbnail);
  const imageUrl = defaultImage?.imageUrl || 'https://via.placeholder.com/300x300?text=No+Image';
  const defaultVariant = product.variants?.find((v) => v.isDefault);
  const price = defaultVariant?.price || 'N/A';

  return (
    <Link href={`/products/${product.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
        <div className="relative h-48 bg-gray-100">
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-cover"
            onError={(e) => {
              e.currentTarget.src = 'https://via.placeholder.com/300x300?text=No+Image';
            }}
          />
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-lg line-clamp-2">{product.name}</h3>
          {product.brand && (
            <p className="text-sm text-gray-600 mb-2">{product.brand.name}</p>
          )}
          <p className="text-sm text-gray-700 line-clamp-2 mb-3">{product.description}</p>
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-blue-600">${price}</span>
            <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
              {product.status}
            </Badge>
          </div>
        </div>
      </Card>
    </Link>
  );
}
