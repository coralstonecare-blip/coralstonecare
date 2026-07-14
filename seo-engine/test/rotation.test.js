import test from "node:test";
import assert from "node:assert/strict";
import { classifyKeyword, selectOpportunity, violatesRotation } from "../src/rotation.js";

const clusters = [
  { id: "cleaning", label: "Stone cleaning", terms: ["coral stone cleaning", "algae removal"] },
  { id: "sealing", label: "Stone sealing", terms: ["coral stone sealing", "reseal coral stone"] }
];

test("classifies a keyword into the strongest cluster", () => {
  assert.equal(classifyKeyword("safe coral stone cleaning in Miami", clusters), "cleaning");
});

test("blocks a fourth consecutive post in the same cluster", () => {
  assert.equal(violatesRotation("cleaning", ["cleaning", "cleaning", "cleaning"], 3), true);
  const selected = selectOpportunity({
    candidates: [
      { keyword: "coral stone cleaning tips", cluster: "cleaning", impressions: 100 },
      { keyword: "when to reseal coral stone", cluster: "sealing", impressions: 10 }
    ],
    clusters,
    state: { published: [], drafts: [], clusterHistory: ["cleaning", "cleaning", "cleaning"] },
    maximum: 3
  });
  assert.equal(selected.cluster, "sealing");
});

test("excludes previously attempted and forbidden supplier topics", () => {
  const selected = selectOpportunity({
    candidates: [
      { keyword: "coral stone supplier Miami", cluster: "cleaning", impressions: 500 },
      { keyword: "clean coral stone safely", cluster: "cleaning", impressions: 100 },
      { keyword: "reseal coral stone in Miami", cluster: "sealing", impressions: 50 }
    ],
    clusters,
    state: { published: [], drafts: [{ keyword: "clean coral stone safely" }], clusterHistory: [] },
    forbiddenIntents: ["coral stone supplier"],
    maximum: 3
  });
  assert.equal(selected.keyword, "reseal coral stone in Miami");
});
