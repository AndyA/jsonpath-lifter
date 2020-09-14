"use strict";

const tap = require("tap");
const lifter = require("..");

tap.test("Simple lifter", async () => {
  const lift = lifter([{ dst: "$.id", src: "$.ident" }]);
  const doc = { ident: "ABC", id: "DEF" };
  const got1 = lift(doc);
  tap.same(got1, { id: "ABC" }, "simple lift");
  tap.same(doc, { ident: "ABC", id: "DEF" }, "doc unchanged");
});

tap.test("Set value", async () => {
  const lift = lifter(
    { set: "Hello", dst: "$.greeting" },
    { set: doc => doc.seq + 1, dst: "$.seq" }
  );

  const doc = { seq: 19, id: "ABC" };
  const got = lift(doc);
  const want = { greeting: "Hello", seq: 20 };
  tap.same(got, want, "set via constant, function");
});

tap.test("More complex lifter", async () => {
  const lift = lifter(
    { dst: "$.id", src: "$.ident" },
    { dst: "$.meta.seq", src: "$.seq", via: v => v + 1 }
  );
});

tap.test("No input document", async () => {
  const lift = lifter();
  tap.same(lift(), undefined, "undef -> undef");
});

tap.test("Side effect only", async () => {
  const ids = [];
  const lift = lifter({ dst: false, src: "$.id", via: id => ids.push(id) });
  const doc = { id: "ABC" };
  const got = lift(doc);
  tap.same(got, undefined, "no value");
  tap.same(ids, ["ABC"], "side effect");
});

tap.test("NOP", async () => {
  const lift = lifter({ dst: false, src: "$.id" });
  const doc = { id: "ABC" };
  const got = lift(doc);
  tap.same(got, undefined, "no value");
});

tap.test("Negative", async () => {
  tap.throws(
    () => lifter({ set: "Foo", src: "$.id" })({}),
    /src and set/i,
    "throws if src with set"
  );

  tap.throws(() => lifter({ set: "Foo" })({}), /no dst/i, "throws if no dst");

  tap.throws(
    () => lifter({ foo: 1, bar: 2 }),
    /unknown/i,
    "unknown properties"
  );

  tap.throws(() => lifter({}), /missing/i, "missing src/set");
});
