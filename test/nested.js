"use strict";

const tap = require("tap");
const _ = require("lodash");
const lifter = require("..");
const jp = require("jsonpath-faster");

const doc = {
  id: "AAA",
  title: "Some lovely document",
  author: { email: "andy@hexten.net", name: "Andy Armstrong" },
  reviewers: [
    { email: "liff@example.com", name: "Liff" },
    { email: "syd@example.com", name: "Syd" }
  ]
};

const want = {
  author: {
    email: "andy@hexten.net",
    name: "Andy Armstrong",
    id: "Andy Armstrong <andy@hexten.net>"
  },
  reviewers: [
    { email: "liff@example.com", name: "Liff", id: "Liff <liff@example.com>" },
    { email: "syd@example.com", name: "Syd", id: "Syd <syd@example.com>" }
  ]
};

tap.test(`Precompiled lifter`, async () => {
  const liftident = lifter(
    { src: "$", dst: "$" },
    {
      dst: "$.id",
      set: doc => `${doc.name} <${doc.email}>`
    }
  );

  const lift = lifter({
    src: "$..[?(@.email && @.name)]",
    via: liftident
  });

  const got = lift(doc);
  tap.same(got, want, "nested lifter");
});

tap.test(`Naked lifter`, async () => {
  const lift = lifter({
    src: "$..[?(@.email && @.name)]",
    via: [
      { src: "$", dst: "$" },
      { dst: "$.id", set: doc => `${doc.name} <${doc.email}>` }
    ]
  });

  const got = lift(doc);
  tap.same(got, want, "naked lifter");
});

tap.test(`Lifter at top level`, async () => {
  const liftEmail = lifter({ src: "$..email", dst: "$.emails", mv: true });
  const lift = lifter({ src: "$.id" }, liftEmail, {
    src: "$.title",
    dst: "$.heading",
    via: v => v.toUpperCase()
  });
  const want = {
    id: "AAA",
    emails: ["andy@hexten.net", "liff@example.com", "syd@example.com"],
    heading: "SOME LOVELY DOCUMENT"
  };

  const got = lift(doc);
  tap.same(got, want, "lifters work as rules");
});
