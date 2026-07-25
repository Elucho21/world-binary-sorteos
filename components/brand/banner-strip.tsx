import type { ActiveBanner } from "@/types/database.types";

export function BannerStrip({ banners }: { banners: ActiveBanner[] }) {
  if (banners.length === 0) return null;

  return (
    <div className="w-full space-y-3">
      {banners.map((banner) => {
        const image = (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={banner.image_url}
            alt={banner.title}
            className="w-full rounded-lg border border-brand-border object-cover"
          />
        );
        return (
          <div key={banner.id}>
            {banner.link_url ? (
              <a href={banner.link_url} target="_blank" rel="noopener noreferrer">
                {image}
              </a>
            ) : (
              image
            )}
          </div>
        );
      })}
    </div>
  );
}
