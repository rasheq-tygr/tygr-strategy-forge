import type { InsightItem, SiteContent } from "../types/content";

/** Fill in gallery/cover media from the shipped fallback when the host CMS copy is empty. */
export function mergeInsightMedia(remote: SiteContent, fallback: SiteContent): SiteContent {
  const fallbackItems = fallback.insights?.items ?? [];
  const items = (remote.insights?.items ?? []).map((item) => {
    const shipped = fallbackItems.find((entry) => entry.id === item.id || entry.slug === item.slug);
    if (!shipped) return item;
    return fillInsightMedia(item, shipped);
  });
  return {
    ...remote,
    insights: {
      ...remote.insights,
      items,
    },
  };
}

export function fillInsightMedia(item: InsightItem, shipped: InsightItem): InsightItem {
  const remoteGallery = item.gallery ?? [];
  const shippedGallery = shipped.gallery ?? [];
  if (remoteGallery.length > 0 || shippedGallery.length === 0) return item;

  const brandCover = !item.image || item.image.startsWith("/brand/");
  return {
    ...item,
    gallery: shippedGallery,
    image: brandCover && shipped.image ? shipped.image : item.image,
    imageAlt: item.imageAlt || shipped.imageAlt,
    imagePosition: item.imagePosition || shipped.imagePosition,
    imageCredit: item.imageCredit || shipped.imageCredit,
  };
}
