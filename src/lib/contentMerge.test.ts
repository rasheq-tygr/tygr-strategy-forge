import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fillInsightMedia, fillSectionHero, mergeEcosystemLinks, mergeInsightMedia, mergeNavDestinations, mergeShippedContent, mergeWorkItemUrls } from "./contentMerge.ts";
import type { InsightItem, SiteContent } from "../types/content";

const baseInsight = (patch: Partial<InsightItem> = {}): InsightItem => ({
  id: "tygr-ventures-launch",
  slug: "tygr-ventures-launch",
  title: "TYGR Ventures is live.",
  excerpt: "",
  body: "One.\n\nTwo.",
  date: "2026-02-01",
  author: "Rasheq Rahman",
  tags: ["Launch"],
  image: "/brand/launch-cover.png",
  imageCredit: "TYGR Ventures",
  gallery: [],
  ...patch,
});

const shell = (item: InsightItem): SiteContent =>
  ({
    insights: { items: [item] },
  }) as SiteContent;

describe("contentMerge", () => {
  it("restores a shipped gallery when the host copy is empty", () => {
    const shipped = baseInsight({
      image: "/insights/launch/standing.jpg",
      imageAlt: "Standing cover",
      gallery: [{ src: "/insights/launch/room.jpg", alt: "Room", after: 0, layout: "wide" }],
    });
    const next = fillInsightMedia(baseInsight(), shipped);
    assert.equal(next.gallery?.length, 1);
    assert.equal(next.image, "/insights/launch/standing.jpg");
    assert.equal(next.imageAlt, "Standing cover");
  });

  it("keeps a host gallery that already has photos", () => {
    const host = baseInsight({
      gallery: [{ src: "/custom.jpg", alt: "Custom" }],
      image: "/brand/launch-cover.png",
    });
    const shipped = baseInsight({
      gallery: [{ src: "/insights/launch/room.jpg", alt: "Room" }],
      image: "/insights/launch/standing.jpg",
    });
    const next = fillInsightMedia(host, shipped);
    assert.equal(next.gallery?.[0].src, "/custom.jpg");
    assert.equal(next.image, "/brand/launch-cover.png");
  });

  it("keeps an intentionally cleared gallery when the host has a real cover", () => {
    const host = baseInsight({
      gallery: [],
      image: "/uploads/custom-cover.jpg",
      imageAlt: "Custom cover",
    });
    const shipped = baseInsight({
      gallery: [{ src: "/insights/launch/room.jpg", alt: "Room" }],
      image: "/insights/launch/standing.jpg",
    });
    const next = fillInsightMedia(host, shipped);
    assert.deepEqual(next.gallery, []);
    assert.equal(next.image, "/uploads/custom-cover.jpg");
  });

  it("restores a shipped gallery when the host gallery field is missing", () => {
    const host = baseInsight();
    delete (host as { gallery?: InsightItem["gallery"] }).gallery;
    const shipped = baseInsight({
      gallery: [{ src: "/insights/launch/room.jpg", alt: "Room" }],
      image: "/insights/launch/standing.jpg",
    });
    const next = fillInsightMedia(host, shipped);
    assert.equal(next.gallery?.[0].src, "/insights/launch/room.jpg");
  });

  it("merges matching insight items on the site content object", () => {
    const remote = shell(baseInsight());
    const fallback = shell(
      baseInsight({
        image: "/insights/launch/standing.jpg",
        gallery: [{ src: "/insights/launch/cake.jpg", alt: "Cake" }],
      }),
    );
    const next = mergeInsightMedia(remote, fallback);
    assert.equal(next.insights.items[0].gallery?.[0].src, "/insights/launch/cake.jpg");
  });

  it("fills a missing section hero from shipped content", () => {
    const next = fillSectionHero(
      { title: "Live" },
      {
        title: "Shipped",
        image: "/insights/launch/gathering.jpg",
        imageAlt: "Guests gathered in the launch room.",
        imageCredit: "TYGR Ventures",
      },
    );
    assert.equal(next.image, "/insights/launch/gathering.jpg");
    assert.equal(next.imageAlt, "Guests gathered in the launch room.");
    assert.equal(next.title, "Live");
  });

  it("keeps a host section hero photo", () => {
    const next = fillSectionHero(
      { image: "/uploads/custom.jpg", imageAlt: "Custom" },
      { image: "/insights/launch/gathering.jpg", imageAlt: "Gathering" },
    );
    assert.equal(next.image, "/uploads/custom.jpg");
    assert.equal(next.imageAlt, "Custom");
  });

  it("upgrades hash nav links to dedicated pages from shipped content", () => {
    const next = mergeNavDestinations(
      {
        cta: "Book",
        links: [
          { label: "Ecosystem", href: "/#ecosystem" },
          { label: "Capabilities", href: "/#capabilities" },
          { label: "Work", href: "/work" },
        ],
      },
      {
        cta: "Book",
        links: [
          { label: "Ecosystem", href: "/ecosystem" },
          { label: "Capabilities", href: "/capabilities" },
          { label: "Work", href: "/work" },
        ],
      },
    );
    assert.equal(next.links[0].href, "/ecosystem");
    assert.equal(next.links[1].href, "/capabilities");
    assert.equal(next.links[2].href, "/work");
  });

  it("merges shipped page heroes onto live site content", () => {
    const remote = {
      ...shell(baseInsight()),
      nav: { cta: "Book", links: [{ label: "Ecosystem", href: "/#ecosystem" }] },
      ecosystem: { title: "Orbit" },
      capabilities: { title: "Caps" },
      work: { title: "Work" },
    } as SiteContent;
    const fallback = {
      ...shell(baseInsight({ image: "/insights/launch/standing.jpg" })),
      nav: { cta: "Book", links: [{ label: "Ecosystem", href: "/ecosystem" }] },
      ecosystem: { title: "Shipped orbit", image: "/insights/launch/gathering.jpg" },
      capabilities: { title: "Shipped caps", image: "/caps.jpg" },
      work: { title: "Shipped work", image: "/work.jpg" },
    } as SiteContent;
    const next = mergeShippedContent(remote, fallback);
    assert.equal(next.ecosystem.image, "/insights/launch/gathering.jpg");
    assert.equal(next.capabilities.image, "/caps.jpg");
    assert.equal(next.work.image, "/work.jpg");
    assert.equal(next.nav.links[0].href, "/ecosystem");
  });

  it("fills empty ecosystem node urls and missing studio apps from shipped content", () => {
    const next = mergeEcosystemLinks(
      {
        title: "Live",
        nodes: [{ id: "tygrlabs", name: "TygrLabs", role: "Tech", summary: "", url: "" }],
      } as SiteContent["ecosystem"],
      {
        title: "Shipped",
        nodes: [{ id: "tygrlabs", name: "TygrLabs", role: "Tech", summary: "", url: "https://tygrlabs.co" }],
        appsEyebrow: "Studio apps",
        appsTitle: "Live products on here.now.",
        apps: [{ id: "mac-news", name: "Mac News", role: "Studio product", url: "https://rosy-atlas-f5jd.here.now/" }],
      } as SiteContent["ecosystem"],
    );
    assert.equal(next.nodes[0].url, "https://tygrlabs.co");
    assert.equal(next.apps?.[0].id, "mac-news");
    assert.equal(next.appsEyebrow, "Studio apps");
  });

  it("keeps host ecosystem apps when they already exist", () => {
    const next = mergeEcosystemLinks(
      {
        nodes: [{ id: "tygrlabs", name: "TygrLabs", role: "Tech", summary: "", url: "https://custom.example" }],
        apps: [{ id: "custom", name: "Custom", role: "Live", url: "https://custom.example" }],
      } as SiteContent["ecosystem"],
      {
        nodes: [{ id: "tygrlabs", name: "TygrLabs", role: "Tech", summary: "", url: "https://tygrlabs.co" }],
        apps: [{ id: "mac-news", name: "Mac News", role: "Studio product", url: "https://rosy-atlas-f5jd.here.now/" }],
      } as SiteContent["ecosystem"],
    );
    assert.equal(next.nodes[0].url, "https://custom.example");
    assert.equal(next.apps?.[0].id, "custom");
  });

  it("fills empty work item live urls from shipped content", () => {
    const next = mergeWorkItemUrls(
      {
        items: [{ id: "mac-news", slug: "mac-news", title: "Mac News", url: "" }],
      } as SiteContent["work"],
      {
        items: [{ id: "mac-news", slug: "mac-news", title: "Mac News", url: "https://rosy-atlas-f5jd.here.now/" }],
      } as SiteContent["work"],
    );
    assert.equal(next.items[0].url, "https://rosy-atlas-f5jd.here.now/");
  });
});

