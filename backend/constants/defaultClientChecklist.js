/** Same labels as frontend `defaultClientChecklist.js` — seed new events with a starter checklist. */
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

export function defaultClientChecklistForCreate() {
  return DEFAULT_CLIENT_CHECKLIST_LABELS.map((text, i) => ({
    text,
    done: false,
    notes: "",
    sortOrder: i,
  }));
}
