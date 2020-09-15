"use strict";

const tap = require("tap");
const _ = require("lodash");

const lifter = require("..");

const lower = s => s.toLowerCase();
const reverse = s =>
  s
    .split("")
    .reverse()
    .join("");

tap.test("access local storage", async () => {
  const lift = lifter(
    { set: "OK", dst: "$.status" },
    { src: "@.id", dst: "$.ident" }
  );
  const got = lift({}, {}, { local: { id: "ABC" } });
  const want = { status: "OK", ident: "ABC" };
  tap.same(got, want, "fetch from local");
});

tap.test("use local storage", async () => {
  const lift = lifter(
    { dst: "@.id", src: "$.ident", via: lower },
    { dst: "$.status", set: "OK" },
    { dst: "$.ID", src: "@.id", via: reverse }
  );

  const doc = { ident: "XYZ" };
  const got = lift(doc);
  const want = { ID: "zyx", status: "OK" };
  tap.same(got, want, "use local");
});

tap.test("local storage scope", async () => {
  const innerLift = lifter(
    { dst: "@.id", src: "$.ident", via: lower },
    { dst: "$.ID", src: "@.id", via: reverse }
  );

  const lift = lifter(
    { dst: "@.id", src: "$.ident", via: lower },
    { src: "$.parts[*]", via: innerLift },
    { dst: "$.ID", src: "@.id", via: reverse }
  );

  const doc = {
    ident: "XYZ",
    parts: [{ ident: "ABC" }, { ident: "DEF" }, { ident: "GHI" }]
  };

  const want = {
    ID: "zyx",
    parts: [{ ID: "cba" }, { ID: "fed" }, { ID: "ihg" }]
  };

  const got = lift(doc);
  tap.same(got, want, "nested local storage");
});

tap.test("local in context", async () => {
  const lift = lifter(
    { dst: "@.programme_id", src: "$.uuid" },
    {
      dst: "$.info",
      src: "$",
      via: [{ dst: "$.pid", set: (doc, $) => $.local.programme_id }]
    }
  );
  const doc = { uuid: "3ec257fe74334093aa569d3c93506fb7" };
  const got = lift(doc);
  tap.same(
    got,
    { info: { pid: "3ec257fe74334093aa569d3c93506fb7" } },
    "$.local"
  );
});
