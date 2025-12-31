// src/lib/render-structured-text.tsx
// Render segur de text pla estructurat (NO HTML, NO dangerouslySetInnerHTML)

import * as React from 'react';

/**
 * Renderitza text pla estructurat com a React nodes.
 *
 * Format suportat:
 * - Línies normals → <p>
 * - Línies que comencen amb "- " → <li> dins <ul>
 * - Línies buides → ignorades
 *
 * IMPORTANT: NO accepta HTML. Tot es tracta com a text pla.
 * Això és una mesura de seguretat per evitar XSS.
 */
export function renderStructuredText(text: string | null | undefined): React.ReactNode {
  if (!text) return null;

  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: string[] = [];

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="list-disc pl-4 space-y-1">
          {currentList.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  for (const line of lines) {
    if (line.startsWith('- ')) {
      // Línia de llista
      currentList.push(line.slice(2));
    } else {
      // Flush llista pendent si n'hi ha
      flushList();
      // Línia normal (ignorar buides)
      if (line.trim()) {
        elements.push(<p key={`p-${elements.length}`}>{line}</p>);
      }
    }
  }

  // Flush llista final si n'hi ha
  flushList();

  if (elements.length === 0) return null;

  return <div className="space-y-2">{elements}</div>;
}
