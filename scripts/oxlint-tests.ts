/* oxlint-disable language/missing-value, language/optional-type -- Oxlint AST nodes use distinct null and undefined values. */
import type { RuleTester, Scope } from "oxlint/plugins-dev";

import { riskTag, testFunctions } from "./test-risk.ts";

type Rule = Parameters<RuleTester["run"]>[1];
type Visitor = ReturnType<Extract<Rule, { createOnce: unknown }>["createOnce"]>;
type Node = Parameters<NonNullable<Visitor["CallExpression"]>>[0]["parent"];

function isTestCall(node: Node | null) {
  return (
    node?.type === "CallExpression" &&
    node.callee.type === "Identifier" &&
    testFunctions.has(node.callee.name)
  );
}

const risk = {
  createOnce(context) {
    return {
      CallExpression(node) {
        if (!isTestCall(node)) {
          return;
        }
        const { parent } = node;
        for (let ancestor: Node | null = parent; ancestor; ancestor = ancestor.parent) {
          if (isTestCall(ancestor)) {
            return;
          }
        }
        if (node.callee.type === "Identifier") {
          const { name } = node.callee;
          for (
            let scope: Scope | null = context.sourceCode.getScope(node);
            scope;
            scope = scope.upper
          ) {
            const variable = scope.set.get(name);
            // A parameter or a local function named like a test function declares no test.
            if (variable) {
              if (variable.defs.every((definition) => definition.type !== "ImportBinding")) {
                return;
              }
              break;
            }
          }
        }
        const statement =
          parent.type === "UnaryExpression" || parent.type === "AwaitExpression"
            ? parent.parent
            : parent;
        // A wrapper that passes its own name and body to describe declares no test itself.
        if (statement.type !== "ExpressionStatement") {
          return;
        }
        const comment = context.sourceCode.getCommentsBefore(statement).at(-1);
        if (
          comment?.type !== "Block" ||
          !comment.value.startsWith("*") ||
          !riskTag.test(comment.value)
        ) {
          context.report({ messageId: "missing", node });
        }
      },
    };
  },
  meta: {
    docs: { description: "Give each outer test a risk tag." },
    messages: {
      missing:
        "Put /** @risk impact=<1-5> likelihood=<1-3> */ directly above this test. See docs/checks.md, Test risk.",
    },
    type: "suggestion",
  },
} satisfies Rule;

const plugin = { meta: { name: "tests" }, rules: { risk } };

export default plugin;
