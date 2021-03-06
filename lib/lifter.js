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

const isLocal = path => path && /^@/.test(path) && path.replace(/^@/, "$");

const checkProps = rest => {
  const unknown = Object.keys(rest).sort();
  if (unknown.length)
    throw new Error(`Unknown properties in rule: ${unknown.join(", ")}`);
};

const castLifter = via => {
  if (!via || _.isFunction(via)) return via;
  return lifter(via);
};

const boilerplate = self => Object.assign(self, { mapper: doc => self(doc) });

const preFlight = (doc, out, $) => {
  // Check for use in Array.map or similar
  if (!isNaN(out) && _.isArray($) && $[out] === doc)
    throw new Error(
      `lifter passed to a map-like function. Use lift.mapper instead`
    );
};

const lifter = (...recipe) => {
  const nest = jp.string.nest();

  const lift = (doc, out, $) => {
    preFlight(doc, out, $);
    return liftNest(nest, doc, out, $);
  };

  // Add a rule to the lifter
  const addRule = rule => {
    if (_.isFunction(rule)) return addRule({ src: "$", via: rule });

    const { src, dst, set, via, mv, clone, leaf, ...rest } = rule;
    checkProps(rest);
    const realVia = castLifter(via);

    // take a value and assign it in the appropriate way to
    // the output document
    const action = (value, src, dst, $) => {
      // Flatten function ref.
      if (_.isFunction(dst)) return action(value, src, dst(value, src, $), $);

      // clone before copying
      if (clone) value = _.cloneDeep(value);

      // dst === false: side effects only - no assignment
      if (dst === false) {
        if (realVia) realVia(value, undefined, $);
        return;
      }

      // dst === true / undefined: use src as dst
      if (dst === undefined || dst === true) {
        dst = src;
      }

      const ld = isLocal(dst);
      const key = ld ? "local" : "out";
      const path = ld || dst;

      if (mv) {
        // in mv case the output value is always empty
        if (realVia) value = realVia(value, undefined, $);
        $[key] = jp.visit($[key], path, v => ((v = v || []).push(value), v));
      } else {
        // handle via function
        if (realVia) value = realVia(value, jp.value($[key] || {}, path), $);
        $[key] = jp.visit($[key], path, v => value);
      }
    };

    // set is a special case: no src so we add it as a
    // root ($) action - which by definition fires only
    // once.
    if (set) {
      if (src) throw new Error(`Can't have src and set`);
      if (!dst) throw new Error(`No dst for set`);
      return nest.visitor("$", (v, p, $) =>
        action(_.isFunction(set) ? set($.doc, $) : set, null, dst, $)
      );
    }

    if (!src) throw new Error(`Missing src / set`);

    // Make a handler that resolves dst and calls action
    const handler = (value, path, $) => action(value, path, dst, $);

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

  Object.assign(lift, {
    add(...recipe) {
      for (const rule of _.flattenDeep(recipe)) addRule(rule);
      return this;
    },

    async promise(doc, out, $) {
      preFlight(doc, out, $);
      const { allDeep } = require("./promise");
      return await allDeep(this(doc, out, $));
    }
  });

  return boilerplate(lift.add(recipe));
};

lifter.pipe = (...lifts) => {
  const work = _.flattenDeep(lifts).map(castLifter);
  const last = work.pop() || lifter();
  const pipe = (doc, out, $) => {
    preFlight(doc, out, $);
    for (const lift of work) doc = lift(doc, undefined, $);
    return last(doc, out, $);
  };

  Object.assign(pipe, {
    async promise(doc, out, $) {
      preFlight(doc, out, $);
      for (const lift of work) doc = await lift.promise(doc, undefined, $);
      return await last.promise(doc, out, $);
    }
  });

  return boilerplate(pipe);
};

module.exports = lifter;
