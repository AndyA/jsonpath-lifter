"use strict";

const jp = require("jsonpath-faster");
const _ = require("lodash");

const lifter = (...recipe) => {
  const nest = jp.string.nest();

  const lift = (doc, out) => {
    const $ = { doc, out };
    nest(doc, $);
    return $.out;
  };

  const addRule = rule => {
    const action = (value, dst, $) => {
      if (rule.clone) value = _.cloneDeep(value);
      if (rule.via) value = rule.via(value, jp.value($.out, dst));
      $.out = jp.visit($.out, dst, v => {
        if (rule.mv) return (v || []).concat(value);
        return value;
      });
    };

    if (rule.set) {
      const { set, dst, src } = rule;
      if (src) throw new Error(`Can't have src and set`);
      if (!dst) throw new Error(`No dst for set`);
      return nest.visitor("$", (v, p, $) =>
        action(_.isFunction(set) ? set($.doc) : set, dst, $)
      );
    }

    const handler = rule.dst
      ? _.isFunction(rule.dst)
        ? (value, path, $) => action(value, rule.dst(value, path, $), $)
        : (value, path, $) => action(value, rule.dst, $)
      : (value, path, $) => action(value, path, $);

    const n = rule.leaf ? nest : nest.leaf;
    for (const src of _.castArray(rule.src)) n.visitor(src, handler);
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
