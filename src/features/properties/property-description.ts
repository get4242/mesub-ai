export type PropertyDescriptionSection = {
  heading?: string;
  paragraphs: string[];
  bullets: string[];
};

function headingFrom(line: string) {
  const plain = line.replace(/^#{1,3}\s*/, "").trim();
  if (!plain || plain.length > 100) return null;
  if (/^#{1,3}\s/.test(line)) return plain;
  if (/^[^\p{L}\p{N}\s]+\s+/u.test(line)) return plain;
  if (/[:：]$/.test(plain)) return plain.replace(/[:：]$/, "");
  return null;
}

function appendLines(section: PropertyDescriptionSection, lines: string[]) {
  const text: string[] = [];
  for (const line of lines) {
    const bullet = line.match(/^(?:[-•●▪‣]|\d+[.)])\s+(.+)$/);
    if (bullet) {
      if (text.length) {
        section.paragraphs.push(text.join(" "));
        text.length = 0;
      }
      section.bullets.push(bullet[1]!.trim());
    } else {
      text.push(line);
    }
  }
  if (text.length) section.paragraphs.push(text.join(" "));
}

/** Turns free-form agent or AI text into clear public-facing reading sections. */
export function parsePropertyDescription(value: string): PropertyDescriptionSection[] {
  const groups = value
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((group) => group.split("\n").map((line) => line.trim()).filter(Boolean))
    .filter((group) => group.length);

  const result: PropertyDescriptionSection[] = [];
  for (const lines of groups) {
    const heading = headingFrom(lines[0]!);
    if (heading) {
      const section = { heading, paragraphs: [], bullets: [] };
      appendLines(section, lines.slice(1));
      result.push(section);
      continue;
    }
    const previous = result.at(-1);
    const section = previous && previous.heading && !previous.paragraphs.length && !previous.bullets.length
      ? previous
      : { paragraphs: [], bullets: [] };
    appendLines(section, lines);
    if (section !== previous) result.push(section);
  }
  return result.length ? result : [{ paragraphs: [value.trim()], bullets: [] }];
}
