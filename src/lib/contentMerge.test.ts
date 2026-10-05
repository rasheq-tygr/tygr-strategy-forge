import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fillInsightMedia, mergeInsightMedia } from "./contentMerge.ts";
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
});
