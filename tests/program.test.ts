import { test } from "node:test";
import assert from "node:assert/strict";
import { weekSchema, isLocked, resultOf, type Match } from "../src/lib/program";
const matches: Match[] = Array.from({ length: 15 }, (_, i) => ({
  matchNo: i + 1,
  home: "Ev",
  away: "Deplasman",
  kickoff: "2099-01-01T00:00:00Z",
  finished: false,
  homeGoals: null,
  awayGoals: null,
}));
test("validates complete unique week", () => {
  assert.ok(
    weekSchema.safeParse({ season: "2026/2027", number: 1, matches }).success,
  );
  assert.equal(
    weekSchema.safeParse({
      season: "2026/2027",
      number: 1,
      matches: matches.slice(1),
    }).success,
    false,
  );
  assert.equal(
    weekSchema.safeParse({
      season: "2026/2027",
      number: 1,
      matches: matches.map((m) => ({ ...m, matchNo: 1 })),
    }).success,
    false,
  );
});
test("locks at first kickoff and evaluates only complete results", () => {
  assert.equal(isLocked(matches), false);
  assert.equal(
    isLocked(matches.map((m) => ({ ...m, kickoff: "2020-01-01T00:00:00Z" }))),
    true,
  );
  assert.equal(resultOf(matches), null);
  assert.equal(
    resultOf(
      matches.map((m) => ({
        ...m,
        finished: true,
        homeGoals: 1,
        awayGoals: 0,
      })),
    ),
    "111111111111111",
  );
});

test("completed matches lock a week even if the feed kickoff is in the future", () => {
  assert.equal(
    isLocked(
      matches.map((m) => ({
        ...m,
        finished: true,
        homeGoals: 1,
        awayGoals: 0,
      })),
    ),
    true,
  );
});
