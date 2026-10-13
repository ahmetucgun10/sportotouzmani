import { test } from "node:test";
import assert from "node:assert/strict";
import {
  covers,
  generate,
  hits,
  reduceSystem,
  filterColumns,
  type Outcome,
} from "../src/lib/engine";
const selections = (n: number): Outcome[][] =>
  Array.from({ length: 15 }, (_, i) => (i < n ? ["1", "X", "2"] : ["1"]));
test("Cartesian product is exact and unique", () => {
  const all = generate(selections(4));
  assert.equal(all.length, 81);
  assert.equal(new Set(all).size, 81);
});
for (const g of [12, 13, 14, 15])
  test(`all possible outcomes satisfy ${g} guarantee`, () => {
    const all = generate(selections(6));
    const reduced = reduceSystem(all, g);
    assert.ok(covers(reduced, all, g));
    for (const result of all)
      assert.ok(reduced.some((c) => hits(c, result) >= g));
  });
test("rejects invalid, duplicate and oversized selections", () => {
  assert.throws(() => generate(selections(8)));
  const s = selections(0);
  s[0] = ["1", "1"];
  assert.throws(() => generate(s));
  assert.throws(() => generate([]));
});
test("filters and detects incomplete coverage", () => {
  const all = generate(selections(4));
  const filtered = filterColumns(all, 0, 0);
  assert.ok(filtered.every((c) => !c.includes("X")));
  assert.equal(covers(filtered, all, 15), false);
  assert.equal(hits("111111111111111", "11111111111111X"), 14);
});
