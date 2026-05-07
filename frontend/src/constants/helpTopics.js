/**
 * Preset answers — no API. Anything else goes to admin via POST /help/questions.
 */
export const HELP_TOPICS = [
  {
    id: "events",
    title: "Where do I create or open an event?",
    body: `Use **Events** in the left sidebar to see all your events and open one. From **Overview**, you can also pick a recent event card.

Inside an event, use the tabs at the top (Overview, Timeline, Vendors, Budget, Checklist, etc.) to move between sections.`,
  },
  {
    id: "vendors",
    title: "How do I add or request a vendor?",
    body: `Open your event, go to the **Vendors** tab, choose a category, then pick a vendor from the directory and send a request with your package details. Pending and accepted vendors appear in the same tab.`,
  },
  {
    id: "budget",
    title: "Where is the budget?",
    body: `Open the event → **Budget** tab. You can set your overall budget, add **other expenses**, and see spend from accepted vendor offers.`,
  },
  {
    id: "checklist",
    title: "What is the planning checklist?",
    body: `In the event → **Checklist** tab you get suggested tasks (venue, catering, etc.). You can tick items off, edit text, add lines, and **Save checklist** to keep everything on this event.`,
  },
  {
    id: "browse",
    title: "How do I browse vendors?",
    body: `Use **Browse** in the sidebar to explore vendor profiles. **Starred** saves vendors you want to revisit later.`,
  },
  {
    id: "messages",
    title: "How do messages work?",
    body: `Open **Messages** in the sidebar to chat with vendors you’re connected with. Notifications (bell) alert you to important updates.`,
  },
  {
    id: "public-private",
    title: "Public vs private event",
    body: `When you **create an event**, choose **Public** (poster link & OTP signup) or leave it **Private** (guest list & email invitations). That choice is **permanent** and cannot be changed later.`,
  },
];
