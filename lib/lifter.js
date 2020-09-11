"use strict";

const jp = require("jsonpath-faster");
const _ = require("lodash");

const liftNest = (nest, doc, out, $) => {
  $ = $ || {};
  const local = $.local || {};
  const ctx = { ...$, doc, out, local: { ...local } };
  nest(doc, ctx);
  return ctx.out;
};

const cookVia = via => {
  if (!via || _.isFunction(via)) return via;
  if (_.isArray(via)) return lifter(via);
  throw new Error(`via must be a function or a recipe array`);
};

const isLocal = path => path && /^@/.test(path) && path.replace(/^@/, "$");

const lifter = (...recipe) => {
  const nest = jp.string.nest();

  const lift = (doc, out, $) => liftNest(nest, doc, out, $);

  // Add a rule to the lifter
  const addRule = rule => {
    if (_.isFunction(rule)) return addRule({ src: "$", via: rule });

    const { src, dst, set, via, mv, clone, leaf, ...rest } = rule;

    const unknown = Object.keys(rest).sort();
    if (unknown.length)
      throw new Error(`Unknown properties in rule: ${unknown.join(", ")}`);

    const realVia = cookVia(via);

    // This is the bit that takes a value and assigns
    // it in the appropriate way to the output document
    const action = (value, dst, $) => {
      const ld = isLocal(dst);
      const key = ld ? "local" : "out";
      const path = ld || dst;

      // clone before copying
      if (clone) value = _.cloneDeep(value);

      // dst === false: side effects only - no assignment
      if (dst === false) {
        if (realVia) realVia(value, {}, $);
        return;
      }

      // handle via function
      if (realVia) value = realVia(value, jp.value($[key] || {}, path), $);

      $[key] = jp.visit($[key], path, v => {
        if (mv) {
          (v = v || []).push(value);
          return v;
        }
        return value;
      });
    };

    // set is a special case: no src so we add it as a
    // root ($) action - which by definition fires only
    // once.
    if (set) {
      if (src) throw new Error(`Can't have src and set`);
      if (!dst) throw new Error(`No dst for set`);
      return nest.visitor("$", (v, p, $) =>
        action(_.isFunction(set) ? set($.doc, $) : set, dst, $)
      );
    }

    if (!src) throw new Error(`Missing src / set`);

    // Make a handler that resolves dst.
    const handler =
      dst !== undefined
        ? _.isFunction(dst)
          ? (value, path, $) => action(value, dst(value, path, $), $)
          : (value, path, $) => action(value, dst, $)
        : (value, path, $) => action(value, path, $);

    // Use leaf-only nest if leaf option set
    const n = leaf ? nest.leaf : nest;

    // src may be an array
    for (const path of _.castArray(src)) {
      const localPath = isLocal(path);
      if (localPath) {
        // src is local (@.foo)
        const localNest = jp.string.nest().visitor(localPath, handler);
        n.visitor("$", (v, p, $) => {
          $.out = liftNest(localNest, $.local, $.out, $);
        });
      } else {
        // src is document ($.foo)
        n.visitor(path, handler);
      }
    }
  };

  const self = Object.assign(lift, {
    add(...recipe) {
      for (const rule of _.flattenDeep(recipe)) addRule(rule);
      return this;
    }
  });

  return self.add(recipe);
};

module.exports = lifter;
