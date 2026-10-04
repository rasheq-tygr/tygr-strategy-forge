import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  decodeIdToken,
  googleOauthErrorMessage,
  redirectNonceMatches,
} from "./google.ts";

function jwtWithPayload(payload: Record<string, unknown>): string {
  const json = JSON.stringify(payload);
  const b64 = Buffer.from(json, "utf8").toString("base64url");
  return `header.${b64}.sig`;
}

describe("decodeIdToken", () => {
  it("reads email, verification, and nonce from the payload", () => {
    const token = jwtWithPayload({
      email: "Rasheq@tygrventures.com",
      email_verified: true,
      nonce: "abc-123",
      aud: "client.apps.googleusercontent.com",
      exp: 1_800_000_000,
    });
    const identity = decodeIdToken(token);
    assert.equal(identity?.email, "rasheq@tygrventures.com");
    assert.equal(identity?.emailVerified, true);
    assert.equal(identity?.nonce, "abc-123");
    assert.equal(identity?.aud, "client.apps.googleusercontent.com");
  });

  it("returns null without an email", () => {
    assert.equal(decodeIdToken(jwtWithPayload({ nonce: "abc" })), null);
    assert.equal(decodeIdToken("not-a-jwt"), null);
  });
});

describe("redirect nonce", () => {
  it("requires the stored nonce to match the token claim", () => {
    assert.equal(redirectNonceMatches("abc", "abc"), true);
    assert.equal(redirectNonceMatches("abc", "other"), false);
    assert.equal(redirectNonceMatches("abc", null), false);
    assert.equal(redirectNonceMatches(undefined, "abc"), false);
    assert.equal(redirectNonceMatches("", ""), false);
  });

  it("explains a nonce mismatch to the editor", () => {
    assert.match(googleOauthErrorMessage("nonce_mismatch"), /could not be verified/i);
    assert.equal(googleOauthErrorMessage("access_denied"), "Google sign-in was cancelled.");
  });
});
