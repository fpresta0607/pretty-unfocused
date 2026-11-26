import { escapeHtml } from './escape-html.ts';

interface SectionHeading {
  id: string;
  accessibleName: string;
  lines: readonly string[];
  script: string;
}

function renderLine(line: string): string {
  return `<span class="section-heading-mask"><span class="section-heading-line" data-heading="line">${escapeHtml(line)}</span></span>`;
}

export function renderSectionHeading({ id, accessibleName, lines, script }: SectionHeading): string {
  return `<h2 class="section-heading" id="${id}" data-heading-group data-stain-landing>
        <span class="visually-hidden">${escapeHtml(accessibleName)}</span>
        <span class="section-heading-visual" aria-hidden="true">
          ${lines.map(renderLine).join('\n          ')}
          <span class="section-heading-script-line"><span class="section-heading-script" data-heading="script">${escapeHtml(script)}</span></span>
        </span>
      </h2>`;
}
