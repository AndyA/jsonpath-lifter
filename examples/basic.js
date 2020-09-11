"use strict";

const lifter = require("..");

if (0) {
  const doc = {
    reporter: {
      name: "Andy Armstrong",
      email: "andy@example.com"
    },
    links: [
      "https://github.com/AndyA",
      "https://twitter.com/AndyArmstrong",
      "https://www.facebook.com/index.sh"
    ],
    repos: [
      { n: "jsonpath-faster", u: "https://github.com/AndyA/jsonpath-faster" },
      { n: "jsonpath-lifter", u: "https://github.com/AndyA/jsonpath-lifter" },
      { n: "node-bktree-fast", u: "https://github.com/AndyA/node-bktree-fast" },
      { n: "encoding-sleuth", u: "https://github.com/AndyA/encoding-sleuth" }
    ]
  };

  const want = {
    ident: "Andy Armstrong <andy@example.com>",
    links: [
      "https://github.com/AndyA",
      "https://twitter.com/AndyArmstrong",
      "https://www.facebook.com/index.sh",
      "https://github.com/AndyA/jsonpath-faster",
      "https://github.com/AndyA/jsonpath-lifter",
      "https://github.com/AndyA/node-bktree-fast",
      "https://github.com/AndyA/encoding-sleuth"
    ]
  };

  const lift = lifter(
    {
      src: "$.reporter",
      dst: "$.ident",
      via: rep => `${rep.name} <${rep.email}>`
    },
    {
      src: ["$.links[*]", "$.repos[*].u"],
      dst: "$.links",
      mv: true
    }
  );

  const got = lift(doc);
  console.log(got);
}
