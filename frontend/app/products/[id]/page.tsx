
import { Suspense } from 'react';
import ProductDetailsClient from './ProductDetailsClient';

export default function ProductDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<p>Loading product...</p>}>
      <ProductDetailsLoader params={params} />
    </Suspense>
  );
}

async function ProductDetailsLoader({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProductDetailsClient id={id} />;
}
