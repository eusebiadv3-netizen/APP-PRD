/** Formats a "YYYY-MM-DD" date input value as "DD/MM/YYYY" for display. */
export function formatDateEs(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}/${year}`;
}

/** Today's date as a "YYYY-MM-DD" string, matching an `<input type="date">` value. */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
