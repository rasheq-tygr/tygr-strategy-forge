import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toRouterLocation } from "./navHref.ts";

describe("toRouterLocation", () => {
  it("leaves path-only hrefs as strings so NavLink can match them", () => {
    assert.equal(toRouterLocation("/work"), "/work");
    assert.equal(toRouterLocation("/insights"), "/insights");
  });

  it("splits hash hrefs so React Router does not treat # as pathname", () => {
    assert.deepEqual(toRouterLocation("/#ecosystem"), {
      pathname: "/",
      hash: "#ecosystem",
    });
    assert.deepEqual(toRouterLocation("/#capabilities"), {
      pathname: "/",
      hash: "#capabilities",
    });
  });

  it("defaults an empty path before the hash to /", () => {
    assert.deepEqual(toRouterLocation("#ecosystem"), {
      pathname: "/",
      hash: "#ecosystem",
    });
  });
});
