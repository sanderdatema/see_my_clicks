<!-- see-my-clicks:start -->
## See My Clicks

This project uses [see-my-clicks](https://github.com/sanderdatema/see_my_clicks) — a Vite plugin that captures Alt+Click element info during development.

When the user asks you to check their clicks (e.g. "check my clicks", "what did I click", "/clicked"):

1. Read the file `.see-my-clicks/clicked.json` in the project root.
2. If the file contains `{"sessions":[]}` or doesn't exist, tell the user: "No clicks found. Alt+Click an element in the browser to capture it."
3. The file contains sessions, each with a name and an array of clicks. For each session, list the session name, then for each click summarize:
   - **Element**: tag, selector, text content
   - **Component**: framework component if detected (React, Vue, or Svelte) and its source file
   - **Page**: the URL where it was clicked
   - **Comment**: the user's comment — this is the most important part, it tells you what the user wants changed
<!-- action:start -->
4. If comments are present, suggest concrete fixes. Group related clicks together. Respect session boundaries — each session is a separate batch of feedback.
5. If no comments, present the element info and ask what to do.
<!-- action:end -->
6. After processing, reset the file using a shell command (e.g. `printf '{"sessions":[]}' > .see-my-clicks/clicked.json`), not a file-write tool, to avoid showing a large diff of the old contents.
<!-- see-my-clicks:end -->
