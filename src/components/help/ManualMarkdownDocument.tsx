import { ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { extractToc, parseMarkdownWithIds } from '@/lib/help/manual-toc';

interface ManualMarkdownDocumentProps {
  markdown: string;
  tocLabel: string;
  backToTopLabel: string;
}

function getTocPadding(level: 1 | 2 | 3) {
  switch (level) {
    case 1:
      return 'pl-0';
    case 2:
      return 'pl-3';
    case 3:
      return 'pl-6';
  }
}

function getHeadingClasses(level: 1 | 2 | 3) {
  switch (level) {
    case 1:
      return 'text-xl font-bold mt-8 mb-4 scroll-mt-24';
    case 2:
      return 'text-lg font-semibold mt-6 mb-3 scroll-mt-24';
    case 3:
      return 'text-base font-medium mt-4 mb-2 scroll-mt-24';
  }
}

export function ManualMarkdownDocument({
  markdown,
  tocLabel,
  backToTopLabel,
}: ManualMarkdownDocumentProps) {
  const toc = extractToc(markdown);
  const parsedContent = parseMarkdownWithIds(markdown);

  return (
    <>
      {toc.length > 0 && (
        <div className="rounded-lg border bg-muted/30 p-4 mb-8">
          <h2 className="font-semibold mb-3">{tocLabel}</h2>
          <nav className="space-y-1">
            {toc.map((entry, index) => (
              <a
                key={`${entry.id}-${index}`}
                href={`#${entry.id}`}
                className={`block text-sm text-muted-foreground hover:text-foreground hover:underline ${getTocPadding(entry.level)}`}
              >
                {entry.text}
              </a>
            ))}
          </nav>
        </div>
      )}

      <div className="rounded-lg border bg-muted/30 p-6">
        {parsedContent.map((line, index) => {
          if (line.type === 'heading') {
            const Tag = line.level === 1 ? 'h2' : line.level === 2 ? 'h3' : 'h4';
            return (
              <Tag
                key={index}
                id={line.id}
                className={getHeadingClasses(line.level)}
              >
                {line.text}
              </Tag>
            );
          }

          if (line.type === 'empty') {
            return <div key={index} className="h-3" />;
          }

          return (
            <p
              key={index}
              className="text-sm leading-6 text-muted-foreground whitespace-pre-wrap"
            >
              {line.content}
            </p>
          );
        })}
      </div>

      <div className="mt-6 flex justify-center">
        <Button variant="ghost" size="sm" asChild>
          <a href="#top">
            <ArrowUp className="h-4 w-4 mr-2" />
            {backToTopLabel}
          </a>
        </Button>
      </div>
    </>
  );
}
