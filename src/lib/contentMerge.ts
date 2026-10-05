import type { InsightItem, SiteContent } from "../types/content";

function isBrandOrEmptyCover(image: string | undefined) {
  return !image || image.startsWith("/brand/");
}

/** Fill in gallery/cover media from the shipped fallback when the host CMS copy looks stale. */
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
  const shippedGallery = shipped.gallery ?? [];
  if (shippedGallery.length === 0) return item;

  const galleryMissing = item.gallery == null;
  const galleryEmptyAndStaleCover =
    Array.isArray(item.gallery) && item.gallery.length === 0 && isBrandOrEmptyCover(item.image);

  // Respect an explicit empty gallery when the host already has a real cover photo.
  if (!galleryMissing && !galleryEmptyAndStaleCover) return item;

  const brandCover = isBrandOrEmptyCover(item.image);
  return {
    ...item,
    gallery: shippedGallery,
    image: brandCover && shipped.image ? shipped.image : item.image,
    imageAlt: item.imageAlt || shipped.imageAlt,
    imagePosition: item.imagePosition || shipped.imagePosition,
    imageCredit: item.imageCredit || shipped.imageCredit,
  };
}
