import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Brand } from "./public-shell";

describe("production brand", () => {
  it("renders the approved Mesub artwork with accessible text instead of the placeholder mark", () => {
    const html = renderToStaticMarkup(createElement(Brand));
    expect(html).toContain("%2Fbrand%2Fmesub-ai-logo.png");
    expect(html).toContain('alt="Mesub AI"');
    expect(html).not.toContain("brand-mark");
  });
});
