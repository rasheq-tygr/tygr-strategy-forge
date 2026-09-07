import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createRateLimiter,
  emailOnAllowlist,
  googleClaimsValid,
  imageExtFromMagic,
  isAllowedUploadExt,
  isIsoZulu,
  isPlaceholderPassword,
  isProductionPasswordUsable,
  isSafeHref,
  resolveBookingTypeId,
  safeHttpsUrl,
  sanitizeBooking,
  sanitizeBookingType,
  secretEquals,
  tidycalHostedPath,
} from "./security.ts";

describe("passwords", () => {
  it("treats empty and documented placeholders as unusable in production", () => {
    assert.equal(isPlaceholderPassword(""), true);
    assert.equal(isPlaceholderPassword("change-me"), true);
    assert.equal(isPlaceholderPassword("local-dev-only"), true);
    assert.equal(isProductionPasswordUsable("change-me"), false);
    assert.equal(isProductionPasswordUsable("short"), false);
    assert.equal(isProductionPasswordUsable("a-reasonably-long-secret"), true);
  });

  it("compares secrets in constant-length pairs", () => {
    assert.equal(secretEquals("abc123", "abc123"), true);
    assert.equal(secretEquals("abc123", "abc124"), false);
    assert.equal(secretEquals("abc", "abcd"), false);
    assert.equal(secretEquals("", "x"), false);
  });
});

describe("booking type ids", () => {
  it("accepts only digit ids and prefers the configured type", () => {
    assert.equal(resolveBookingTypeId("2074091", ""), "2074091");
    assert.equal(resolveBookingTypeId("1/../bookings", ""), null);
    assert.equal(resolveBookingTypeId("../contacts", ""), null);
    assert.equal(resolveBookingTypeId("2074091", "111"), "111");
    assert.equal(resolveBookingTypeId("2074091", "not-digits"), null);
  });

  it("accepts TidyCal Zulu timestamps only", () => {
    assert.equal(isIsoZulu("2026-09-07T12:00:00Z"), true);
    assert.equal(isIsoZulu("2026-09-07T12:00:00.000Z"), false);
    assert.equal(isIsoZulu("2026-09-07T12:00:00Z&extra=1"), false);
  });
});

describe("hrefs and meeting urls", () => {
  it("rejects javascript and data urls", () => {
    assert.equal(isSafeHref("javascript:alert(1)"), false);
    assert.equal(isSafeHref("data:text/html,x"), false);
    assert.equal(isSafeHref("https://tidycal.com/rasheq/intro"), true);
    assert.equal(isSafeHref("/work"), true);
    assert.equal(isSafeHref("mailto:rasheq@tygrventures.com"), true);
  });

  it("builds hosted TidyCal URLs only from safe path segments", () => {
    assert.equal(
      tidycalHostedPath("rasheq/tygr-ventures-30-minute-intro"),
      "https://tidycal.com/rasheq/tygr-ventures-30-minute-intro",
    );
    assert.equal(tidycalHostedPath("//evil.example/phish"), "");
    assert.equal(tidycalHostedPath("javascript:alert(1)"), "");
  });

  it("keeps https meeting links and drops others", () => {
    assert.equal(safeHttpsUrl("https://meet.google.com/abc-defg-hij"), "https://meet.google.com/abc-defg-hij");
    assert.equal(safeHttpsUrl("javascript:alert(1)"), undefined);
    assert.equal(safeHttpsUrl("http://evil.example/"), undefined);
  });
});

describe("google claims", () => {
  const base = {
    email: "rasheq@tygrventures.com",
    email_verified: true,
    aud: "client.apps.googleusercontent.com",
    iss: "https://accounts.google.com",
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  it("fails closed without a client id or allowlist", () => {
    assert.equal(googleClaimsValid(base, "", ["rasheq@tygrventures.com"]), false);
    assert.equal(googleClaimsValid(base, "client.apps.googleusercontent.com", []), false);
  });

  it("rejects the wrong audience, issuer, or email", () => {
    assert.equal(
      googleClaimsValid({ ...base, aud: "other" }, "client.apps.googleusercontent.com", [
        "rasheq@tygrventures.com",
      ]),
      false,
    );
    assert.equal(
      googleClaimsValid({ ...base, iss: "https://evil.example" }, "client.apps.googleusercontent.com", [
        "rasheq@tygrventures.com",
      ]),
      false,
    );
    assert.equal(
      googleClaimsValid(base, "client.apps.googleusercontent.com", ["someone-else@tygrventures.com"]),
      false,
    );
  });

  it("accepts a verified Google token for an allowlisted editor", () => {
    assert.equal(
      googleClaimsValid(base, "client.apps.googleusercontent.com", ["rasheq@tygrventures.com"]),
      true,
    );
  });

  it("denies every address when the allowlist is empty", () => {
    assert.equal(emailOnAllowlist("rasheq@tygrventures.com", []), false);
  });
});

describe("uploads", () => {
  it("drops svg and other scriptable extensions", () => {
    assert.equal(isAllowedUploadExt(".svg"), false);
    assert.equal(isAllowedUploadExt(".png"), true);
    assert.equal(isAllowedUploadExt(".jpg"), true);
  });

  it("sniffs png/jpeg and rejects svg xml", () => {
    assert.equal(imageExtFromMagic(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])), ".png");
    assert.equal(imageExtFromMagic(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0])), ".jpg");
    const svg = new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'></svg>????");
    assert.equal(imageExtFromMagic(svg), null);
  });
});

describe("tidycal sanitizers", () => {
  it("strips unknown booking-type fields", () => {
    const clean = sanitizeBookingType({
      id: 2074091,
      title: "Intro",
      duration_minutes: 30,
      user_email: "host@tygrventures.com",
      api_token: "secret",
      locations: [{ location_link_source: "google_meet", location_option: "Google Meet", extra: 1 }],
    });
    assert.deepEqual(clean, {
      id: 2074091,
      title: "Intro",
      duration_minutes: 30,
      description: "",
      url_slug: "",
      price: 0,
      currency_code: "",
      locations: [{ location_option: "Google Meet", location_link_source: "google_meet" }],
    });
  });

  it("drops host contact blobs from bookings", () => {
    const clean = sanitizeBooking({
      id: 9,
      starts_at: "2026-09-07T12:00:00Z",
      ends_at: "2026-09-07T12:30:00Z",
      timezone: "America/New_York",
      meeting_url: "https://meet.google.com/abc",
      contact: { email: "host@tygrventures.com" },
      user: { email: "host@tygrventures.com" },
    });
    assert.deepEqual(clean, {
      id: 9,
      starts_at: "2026-09-07T12:00:00Z",
      ends_at: "2026-09-07T12:30:00Z",
      timezone: "America/New_York",
      meeting_url: "https://meet.google.com/abc",
    });
  });
});

describe("book rate limit", () => {
  it("allows a burst then blocks", () => {
    const allow = createRateLimiter(2, 60_000);
    assert.equal(allow("1.1.1.1", 1000), true);
    assert.equal(allow("1.1.1.1", 1001), true);
    assert.equal(allow("1.1.1.1", 1002), false);
    assert.equal(allow("9.9.9.9", 1002), true);
  });
});
