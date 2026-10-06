import type { InsightItem, SectionHero, SiteContent } from "../types/content";

function isBrandOrEmptyCover(image: string | undefined) {
  return !image || image.startsWith("/brand/");
}

const NAV_PAGE_UPGRADES: Record<string, string> = {
  "/#ecosystem": "/ecosystem",
  "/#capabilities": "/capabilities",
};

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

/** Apply shipped page heroes and dedicated nav routes onto a live host copy. */
export function mergeShippedContent(remote: SiteContent, fallback: SiteContent): SiteContent {
  const withInsights = mergeInsightMedia(remote, fallback);
  return {
    ...withInsights,
    ecosystem: mergeEcosystemLinks(
      fillSectionHero(withInsights.ecosystem, fallback.ecosystem),
      fallback.ecosystem,
    ),
    capabilities: fillSectionHero(withInsights.capabilities, fallback.capabilities),
    work: mergeWorkItemUrls(fillSectionHero(withInsights.work, fallback.work), fallback.work),
    nav: mergeNavDestinations(withInsights.nav, fallback.nav),
  };
}

function fillEmptyUrl<T extends { url?: string }>(remote: T, shipped?: T | null): T {
  if (!shipped?.url || remote.url) return remote;
  return { ...remote, url: shipped.url };
}

/** Fill empty company URLs and missing studio apps from the shipped catalog. */
export function mergeEcosystemLinks(
  remote: SiteContent["ecosystem"],
  shipped: SiteContent["ecosystem"],
): SiteContent["ecosystem"] {
  const shippedNodes = shipped?.nodes ?? [];
  const nodes = (remote?.nodes ?? []).map((node) =>
    fillEmptyUrl(
      node,
      shippedNodes.find((entry) => entry.id === node.id),
    ),
  );
  const apps = remote?.apps?.length ? remote.apps : shipped?.apps;
  return {
    ...remote,
    nodes,
    apps,
    appsEyebrow: remote?.appsEyebrow || shipped?.appsEyebrow,
    appsTitle: remote?.appsTitle || shipped?.appsTitle,
  };
}

/** Fill empty work-item live URLs from shipped case studies. */
export function mergeWorkItemUrls(
  remote: SiteContent["work"],
  shipped: SiteContent["work"],
): SiteContent["work"] {
  const shippedItems = shipped?.items ?? [];
  const items = (remote?.items ?? []).map((item) => {
    const match = shippedItems.find((entry) => entry.id === item.id || entry.slug === item.slug);
    return fillEmptyUrl(item, match);
  });
  return { ...remote, items };
}

export function fillSectionHero<T extends SectionHero>(remote: T, shipped?: T | null): T {
  if (!shipped) return remote;
  return {
    ...remote,
    image: remote.image || shipped.image,
    imageAlt: remote.imageAlt || shipped.imageAlt,
    imagePosition: remote.imagePosition || shipped.imagePosition,
    imageCredit: remote.imageCredit || shipped.imageCredit,
  };
}

export function mergeNavDestinations(
  remote: SiteContent["nav"],
  shipped: SiteContent["nav"],
): SiteContent["nav"] {
  if (!remote?.links?.length || !shipped?.links?.length) return remote;
  return {
    ...remote,
    links: remote.links.map((link) => {
      const nextHref = NAV_PAGE_UPGRADES[link.href];
      if (!nextHref) return link;
      const match = shipped.links.find((entry) => entry.label === link.label);
      if (!match || match.href !== nextHref) return link;
      return { ...link, href: nextHref };
    }),
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
