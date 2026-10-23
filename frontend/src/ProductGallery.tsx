import { useEffect, useState } from "react";
import { api, assetUrl } from "./api";
import type { Product } from "./catalog";
export default function ProductGallery({ product }: { product: Product }) {
  const [images, setImages] = useState<
    { id: number; url: string; alt: string }[]
  >([]);
  const [active, setActive] = useState(product.image_url || "");
  useEffect(() => {
    const controller = new AbortController();
    api<{ images: { id: number; url: string; alt: string }[] }>(
      `/api/v1/products/${product.id}`,
      { signal: controller.signal },
    )
      .then((data) => setImages(data.images))
      .catch(() => {});
    return () => controller.abort();
  }, [product.id]);
  return (
    <>
      <div
        className={`detail-photo product-photo product-photo-${product.photo}`}
        role="img"
        aria-label={images.find((i) => i.url === active)?.alt || product.name}
        style={
          active
            ? {
                backgroundImage: `url("${assetUrl(active)}")`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      />
      {images.length > 0 && (
        <div className="gallery-thumbnails">
          {product.image_url && (
            <button
              aria-label="Ver imagen principal"
              onClick={() => setActive(product.image_url || "")}
            >
              <img src={assetUrl(product.image_url)} alt="Principal" />
            </button>
          )}
          {images.map((image, index) => (
            <button
              key={image.id}
              aria-label={`Ver imagen ${index + 1}`}
              onClick={() => setActive(image.url)}
            >
              <img src={assetUrl(image.url)} alt={image.alt || product.name} />
            </button>
          ))}
        </div>
      )}
    </>
  );
}
