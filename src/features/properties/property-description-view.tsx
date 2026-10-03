import { parsePropertyDescription } from "./property-description";

export function PropertyDescriptionView({ description }: { description: string }) {
  const sections = parsePropertyDescription(description);
  return (
    <section className="property-description" aria-label="รายละเอียดทรัพย์">
      {sections.map((section, index) => (
        <article className="property-description-section" key={`${section.heading ?? "text"}-${index}`}>
          {section.heading ? <h3>{section.heading}</h3> : null}
          {section.paragraphs.map((paragraph, paragraphIndex) => (
            <p key={paragraphIndex}>{paragraph}</p>
          ))}
          {section.bullets.length ? (
            <ul>
              {section.bullets.map((bullet, bulletIndex) => <li key={bulletIndex}>{bullet}</li>)}
            </ul>
          ) : null}
        </article>
      ))}
    </section>
  );
}
