/** Default tasks shown when an event has no checklist saved yet (matches backend new-event seed). */
export const DEFAULT_CLIENT_CHECKLIST_LABELS = [
  "Select venue",
  "Select catering",
  "Confirm date & time",
  "Send invitations",
  "Book entertainment or music",
  "Arrange photography",
  "Plan décor or theme",
  "Finalize guest count",
];

export function createDefaultChecklistRows() {
  const ts = Date.now();
  return DEFAULT_CLIENT_CHECKLIST_LABELS.map((text, i) => ({
    key: `def-${ts}-${i}`,
    _id: undefined,
    text,
    done: false,
    notes: "",
    sortOrder: i,
  }));
}
