"use strict";

const _ = require("lodash");
const tap = require("tap");
const lifter = require("..");

const tests = [
  {
    doc: { ident: "ABC", seq: 1 },
    cases: [
      { name: "copy", recipe: { src: "$" }, want: { ident: "ABC", seq: 1 } },
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
  },
  {
    doc: {
      author: { email: "andy@hexten.net", name: "Andy Armstrong" },
      reviewers: [
        { email: "liff@example.com", name: "Liff" },
        { email: "syd@example.com", name: "Syd" }
      ]
    },
    want: {
      emails: ["andy@hexten.net", "liff@example.com", "syd@example.com"]
    },
    cases: [
      {
        name: "multivalue, discreet paths",
        recipe: [
          { dst: "$.emails", mv: true, src: "$.author.email" },
          { dst: "$.emails", mv: true, src: "$.reviewers[*].email" }
        ]
      },
      {
        name: "multivalue, descendant path",
        recipe: [{ dst: "$.emails", mv: true, src: "$..email" }]
      },
      {
        name: "multivalue, root array",
        recipe: [{ dst: "$", mv: true, src: "$..email" }],
        want: ["andy@hexten.net", "liff@example.com", "syd@example.com"]
      }
    ]
  },
  {
    doc: {
      examples: [
        { email: { user: "andy", domain: "hexten.net" } },
        { email: "andy@hexten.net" }
      ]
    },
    cases: [
      {
        name: "leaf only",
        recipe: { dst: "$.emails", mv: true, leaf: true, src: "$..email" },
        want: { emails: ["andy@hexten.net"] }
      }
    ]
  },
  {
    doc: {
      meta: { email: { host: "hexten.net", user: "andy" } }
    },
    cases: [
      {
        name: "no clone - doc trampled",
        recipe: [
          { dst: "$.email", src: "$.meta.email" },
          {
            dst: "$.email.address",
            set: doc => `${doc.meta.email.user}@${doc.meta.email.host}`
          }
        ],
        want: {
          email: {
            host: "hexten.net",
            user: "andy",
            address: "andy@hexten.net"
          }
        },
        outDoc: {
          meta: {
            email: {
              host: "hexten.net",
              user: "andy",
              address: "andy@hexten.net"
            }
          }
        }
      },
      {
        name: "clone - doc preserved",
        recipe: [
          { dst: "$.email", src: "$.meta.email", clone: true },
          {
            dst: "$.email.address",
            set: doc => `${doc.meta.email.user}@${doc.meta.email.host}`
          }
        ],
        want: {
          email: {
            host: "hexten.net",
            user: "andy",
            address: "andy@hexten.net"
          }
        }
      }
    ]
  }
];

for (const { cases, ...test } of tests) {
  for (const tc of cases) {
    const spec = Object.assign({}, test, tc);
    const { doc, recipe, want, name, outDoc } = _.cloneDeep(spec);
    const lift = lifter(recipe);
    const got = lift(doc);
    tap.same(got, want, `${name}: lift lifts`);
    tap.same(doc, outDoc || spec.doc, `${name}: document unchanged`);
  }
}
