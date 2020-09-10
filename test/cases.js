"use strict";

const _ = require("lodash");
const tap = require("tap");
const lifter = require("..");

const tests = [
  {
    doc: { ident: "ABC", seq: 1 },
    cases: [
      {
        name: "implicit dst",
        recipe: [{ src: "ident" }],
        want: { ident: "ABC" }
      },
      {
        name: "computed dst",
        recipe: [
          {
            src: "ident",
            dst: (value, path, $) => path.replace(/ident/, "rodent")
          }
        ],
        want: { rodent: "ABC" }
      },
      {
        name: "simple via",
        recipe: [{ dst: "id", src: "ident", via: v => v.toLowerCase() }],
        want: { id: "abc" }
      }
    ]
  }
];

for (const { cases, ...test } of tests) {
  for (const tc of cases) {
    const spec = Object.assign({}, test, tc);
    const { doc, recipe, want, name } = _.cloneDeep(spec);
    const lift = lifter(recipe);
    const got = lift(doc);
    tap.same(got, want, `${name}: lift lifts`);
    tap.same(doc, spec.doc, `${name}: document unchanged`);
  }
}
