/**
 * Shared Italian date formatting utilities.
 * Used by ProjectsSheet, ProjectsHomePage, and anywhere else dates are displayed.
 */

/** Returns "oggi", "ieri", or a localized date string (no time). */
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'oggi';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'ieri';
  } else {
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
}

/**
 * For "last opened" timestamps: shows only HH:MM if opened today,
 * otherwise delegates to formatDate.
 */
export function formatLastOpenedDate(timestamp: number): string {
  const date = new Date(timestamp);
  const today = new Date();

  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  }
  return formatDate(timestamp);
}

/**
 * Full date + time string (e.g. "oggi 14:32", "ieri 09:00", "01/01/2025 10:00").
 * Used in ProjectsSheet where timestamps need to include the time.
 */
export function formatDateWithTime(timestamp: number): string {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const time = date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

  if (date.toDateString() === today.toDateString()) {
    return `oggi ${time}`;
  } else if (date.toDateString() === yesterday.toDateString()) {
    return `ieri ${time}`;
  } else {
    return (
      date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
      ` ${time}`
    );
  }
}
