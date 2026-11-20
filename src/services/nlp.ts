import * as chrono from 'chrono-node';
import { Priority } from '../db/tasksRepo';

export interface ParsedReminder {
  title: string;
  dueAt: number | null;
  tag: string;
  priority: Priority;
  rawDateText?: string;
}

export function parseReminderInput(rawInput: string): ParsedReminder {
  if (!rawInput || !rawInput.trim()) {
    return {
      title: '',
      dueAt: null,
      tag: '',
      priority: 'none',
    };
  }

  let text = rawInput.trim();
  let priority: Priority = 'none';
  let tag = '';
  let dueAt: number | null = null;
  let rawDateText: string | undefined = undefined;

  // 1. Extract priority (!high, !p1, !med, !medium, !p2, !low, !p3)
  const highPriorityMatch = text.match(/(?:^|\s)!(high|p1|urgent)(?=\s|$)/i);
  if (highPriorityMatch) {
    priority = 'high';
    text = text.replace(highPriorityMatch[0], ' ');
  } else {
    const medPriorityMatch = text.match(/(?:^|\s)!(med|medium|p2|normal)(?=\s|$)/i);
    if (medPriorityMatch) {
      priority = 'medium';
      text = text.replace(medPriorityMatch[0], ' ');
    } else {
      const lowPriorityMatch = text.match(/(?:^|\s)!(low|p3)(?=\s|$)/i);
      if (lowPriorityMatch) {
        priority = 'low';
        text = text.replace(lowPriorityMatch[0], ' ');
      }
    }
  }

  // 2. Extract tag (#Tag)
  const tagMatch = text.match(/(?:^|\s)#([a-zA-Z0-9_\-]+)(?=\s|$)/);
  if (tagMatch) {
    tag = tagMatch[1];
    text = text.replace(tagMatch[0], ' ');
  }

  // 3. Extract Date/Time with chrono-node
  const chronoResults = chrono.parse(text, new Date(), { forwardDate: true });
  if (chronoResults && chronoResults.length > 0) {
    const firstResult = chronoResults[0];
    const parsedDate = firstResult.start.date();
    dueAt = parsedDate.getTime();
    rawDateText = firstResult.text;

    // Strip parsed date string from title text
    text = text.replace(firstResult.text, ' ');
  }

  // Clean up title whitespace
  const title = text.replace(/\s+/g, ' ').trim();

  return {
    title: title || rawInput.trim(),
    dueAt,
    tag,
    priority,
    rawDateText,
  };
}
