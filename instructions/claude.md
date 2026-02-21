Read the UI elements captured by See My Clicks and act on them.

Steps:

1. Read the file `.see-my-clicks/clicked.json` in the project root.

2. If the file contains `{"sessions":[]}` or doesn't exist, inform the user: "No clicks found. Alt+Click an element in the browser to capture it."

3. The file contains sessions, each with a name and an array of clicks. For each session, list the session name, then for each click summarize:
   - **Element**: tag, selector, text content (truncated)
   - **Component**: framework component if detected (React, Vue, or Svelte) and its source file
   - **Page**: the URL where it was clicked
   - **Comment**: the user's comment (if provided) — this is the most important part, it tells you what the user wants changed

<!-- action:start -->
4. If comments are present, suggest concrete fixes based on the component, selector, and comment. Group related clicks (same component, same page, same concern) together. Respect session boundaries — each session represents a separate batch of feedback.

5. If no comments are present on any click, present the element info and ask the user what they'd like to do with it.
<!-- action:end -->

6. After processing, reset the file by writing `{"sessions":[]}` to `.see-my-clicks/clicked.json`. This is critical — without clearing, the same clicks will show up again next time.
