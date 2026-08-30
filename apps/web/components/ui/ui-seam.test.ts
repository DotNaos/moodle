import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

describe("DotNaos web compatibility seam", () => {
  test("keeps buttons pill-shaped, borderless, and token-backed", () => {
    const html = renderToStaticMarkup(createElement(Button, null, "Continue"));

    expect(html).toContain("rounded-full");
    expect(html).toContain("border-0");
    expect(html).toContain("bg-accent");
    expect(html).toContain("text-text-on-accent");
  });

  test("preserves asChild link semantics", () => {
    const html = renderToStaticMarkup(
      createElement(
        Button,
        { asChild: true, variant: "ghost" },
        createElement("a", { href: "/courses/22584" }, "Open course"),
      ),
    );

    expect(html.startsWith("<a")).toBe(true);
    expect(html).toContain('href="/courses/22584"');
    expect(html).toContain("rounded-full");
    expect(html).not.toContain("<button");
  });

  test("keeps input DOM attributes and the borderless pill treatment", () => {
    const html = renderToStaticMarkup(
      createElement(Input, {
        "aria-label": "Search materials",
        name: "query",
        placeholder: "Search",
        type: "search",
      }),
    );

    expect(html).toContain('aria-label="Search materials"');
    expect(html).toContain('name="query"');
    expect(html).toContain('type="search"');
    expect(html).toContain("rounded-full");
    expect(html).toContain("border-0");
    expect(html).toContain("bg-control");
  });

  test("uses DotNaos surfaces and readable destructive badges", () => {
    const card = renderToStaticMarkup(createElement(Card, null, "Course"));
    const badge = renderToStaticMarkup(
      createElement(Badge, { variant: "destructive" }, "Blocked"),
    );

    expect(card).toContain("bg-bg-1");
    expect(card).toContain("text-text");
    expect(badge).toContain("bg-danger");
    expect(badge).toContain("text-text-on-accent");
  });

  test("keeps nested spinners decorative", () => {
    const html = renderToStaticMarkup(createElement(Spinner));

    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain('role="status"');
    expect(html).not.toContain('aria-label="Loading"');
  });
});
