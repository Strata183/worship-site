# Worthy for Worship Style Guide

Use this guide to keep the site consistent as new pages, resources, and features are added.

## Brand

**Site name:** Worthy for Worship

**Purpose:**
To serve the local church with practical worship resources: song charts, tutorials, articles, and simple tools that help worship leaders and musicians prepare faithfully.

**Audience:**
Local church worship leaders, musicians, and trusted friends. The private song library is designed for sharing within accepted relationships, not for public file distribution.

**Tone:**
Loving, helpful, clear, humble, and practical.

**Core values:**
- Glorify God.
- Serve the local church.
- Keep the site free to use.
- Handle copyrighted music carefully and responsibly.
- Make the app understandable for beginners who may read the code later.


## Logo And Naming

**Primary name:** Worthy for Worship

**Logo usage:**
Use the full site name in the navbar, footer, browser-facing copy, and formal documentation. Until a final logo is created, plain text is the primary wordmark.

**Do not use:**
- Overly decorative religious imagery that distracts from the purpose of serving the church.
- Alternate names, abbreviations, or slogans that compete with "Worthy for Worship."
- Visuals or language that make the site feel commercial, flashy, or self-promotional.

## Colors

| Role | Color | Hex | Notes |
| --- | --- | --- | --- |
| Background | White cream | #F7F5F0 | Main page background |
| Text | Black | #1F2933 | Primary text |
| Muted text | Gray | #4B5563 | Supporting copy |
| Navbar background | Black | #161616 |  |
| Navbar text | White | #FFFFFF |  |
| Accent | Deep Forest | #2D4330 | Active nav states, footer, and key actions |
| Accent light | Soft Forest | #E3EADF | Subtle accent backgrounds and footer text |
| Border | Warm gray | #DDD6CB | Card borders and dividers |

## Typography

**Primary font:**
Inter, Arial, sans-serif

**Heading font:**
Inter, Arial, sans-serif

**Fallback fonts:**
Use Arial if the imported font does not load.

**Heading style:**
Use Inter for page titles, card titles, the site title, and footer title. Headings should feel simple, clean, and modern, with enough weight to be clear but not overly decorative.

**Body text style:**
Use Inter for body copy, navigation, cards, and interface text. Keep paragraphs open, readable, and not too wide.

**Link style:**
No default underlines in the main interface. Use rounded hover backgrounds for nav links, footer links, and cards.

## Layout

**Page width:**
Main pages can use a max width up to 1360px. Reading-heavy pages should stay narrower, around 760px to 920px. The protected song library can be wider because it works more like an app.

**Page alignment:**
Public landing and article index content can be centered. App pages, forms, lists, and dashboards should be left-aligned for easier scanning.

**Spacing rules:**
- I do not want a crowded page! Make everything open
- Use generous spacing between the hero/header and page sections.
- Cards should have enough padding to breathe.
- Avoid stacking too many sections without clear visual breaks.
- Keep repeated tools dense enough to be useful, but do not let labels, buttons, or list rows feel cramped.


**Mobile behavior:**
Stack layouts into one column. Keep navigation usable, forms full-width, and song rows easy to tap. Some scrolling is expected, but avoid unnecessary intro sections that push the actual tool too far down.

## Navigation

**Main nav items:**
- Home 
- Songs
- Tutorials
- Articles
- About

**Home behavior:**
The site title links back to the home page.

**Active page behavior:**
Use the Deep Forest accent background for the active nav item.

**Hover behavior:**
Use rounded hover backgrounds on navbar links. Cards can lift slightly and use the Deep Forest accent on hover.

## Components

### Navbar

**Purpose:**
Easily access the main sections of the site from the top of the screen.

**Rules:**
- The site title links to the home page.
- Keep nav labels short and clear.
- Signed-out users see Login.
- Signed-in users see the account button and dropdown.
- Protected routes should stay linked in the nav; ProtectedRoute handles redirecting signed-out visitors.

### Page Header

**Purpose:**
Give each page a clear first impression: what it is, why it exists, and what the user can do next.

**Rules:**
- Use one `h1` per page.
- Keep supporting text short and specific.
- Use the eyebrow style for small category labels when helpful.
- Do not add a large marketing hero to app-like pages such as Songs or Friends.

### Cards

**Purpose:**
Group a single resource, action, or repeated item in a scannable way.

**Rules:**
- Use cards for resource links, article previews, panels, and repeated list items.
- Keep border radius at 8px or less.
- Use white backgrounds with warm borders for cards and panels.
- Cards that navigate should have a clear hover/focus state.
- Do not put cards inside other cards unless it is a true nested tool state.

### Buttons And Links

**Purpose:**
Help users take actions clearly without guessing what will happen.

**Rules:**
- Primary actions use the Deep Forest accent.
- Secondary row actions may use dark gray.
- Text buttons are for low-risk actions like Refresh.
- Buttons must use `type="button"` unless they intentionally submit a form.
- Links are for navigation. Buttons are for actions such as sign out, upload, edit, delete, accept, and reject.
- Disabled buttons should visibly look disabled and should not appear clickable.

### Forms

**Purpose:**
Collect login details, upload metadata, files, and friend request emails with clear feedback.

**Rules:**
- Stack labels above inputs unless the form is a wide app toolbar.
- Inputs and selects should share the same border, radius, padding, and font.
- Use success and error messages close to the form that caused them.
- Validate required fields before calling Supabase when possible.
- Keep upload fields specific: PDFs only for song files, and key selection required.

### Documentation Comments

**Purpose:**
Make the code approachable for a beginner without cluttering every obvious line.

**Rules:**
- Comment why a helper, route, state group, or security check exists.
- Use simple language and short comments.
- Do not explain basic JavaScript syntax unless it is helpful for a beginner in this project.
- Keep comments accurate when behavior changes.
- Prefer comments near the code they explain.

## Pages

### Home

**Goal:**
Help visitors quickly choose where they want to go next.

**Required content:**
- Short welcome message
- Four dashboard links: Songs, Tutorials, Articles, and About

### Songs

**Goal:**
Provide a private PDF song library where signed-in users can upload, open, search, sort, edit, and delete their own charts.

**Required content:**
- Add Score upload form with title, key, and PDF file.
- Library section count.
- Search by title.
- Sort by title, key, newest, and oldest.
- Score list with title, source, added date, key badge, and actions.
- Empty states for no scores and no search matches.
- Owner-only Edit and Delete actions.

### Tutorials

**Goal:**
Provide a place for future walkthroughs, practice guides, and worship/music training.

**Required content:**
- Clear placeholder text until tutorials are added.
- Future tutorial cards or lesson links should match the resource card style.

### Articles

**Goal:**
Host short studies and reflections on biblical worship and serving the church.

**Required content:**
- Article index with cards.
- Article detail pages using readable body text.
- Back link from article detail to article index.
- Draft placeholder when an article has no body text yet.
- Not-found state for invalid article slugs.

### About

**Goal:**
Explain the heart, purpose, usage expectations, and copyright boundaries for Worthy for Worship.

**Required content:**
- Short mission statement.
- Scripture quotations with references.
- Purpose section.
- Why use this site section.
- How to use section.
- Rules/copyright guidance.
- Contact email.
- LSB permission notice.

### Friends

**Goal:**
Let signed-in users manage sharing relationships for private song library access.

**Required content:**
- Current account name and email.
- Add friend form using email.
- Requests list with names and emails when available.
- Accept and reject actions for incoming pending requests.
- Refresh action.
- Clear success and error feedback.

## Content Voice

**Write like this:**
- Clear and warm.
- Practical and church-focused.
- Direct about rules and copyright responsibilities.
- Encouraging without sounding sales-focused.
- Beginner-friendly in documentation.

**Avoid:**
- Hype, pressure, or marketing-heavy claims.
- Vague spiritual language that does not explain anything practical.
- Condescending instructions.
- Legal-sounding certainty beyond what the app owner can responsibly claim.
- Long paragraphs where a short paragraph or list would be easier to read.

**Example sentence:**
"Upload your own PDF charts, organize them by key, and share access only with accepted friends from your worship team."

## Accessibility

**Contrast:**
Use strong contrast between text and background. Deep Forest on white or Soft Forest is preferred for accents. Do not place muted gray text on low-contrast backgrounds.

**Keyboard navigation:**
Every link, button, input, select, dropdown, and form action must be reachable by keyboard. Hover styles should usually have matching focus styles.

**Image alt text:**
Images that communicate content need useful alt text. Decorative images should use empty alt text. The home guitar image should keep a short descriptive alt.

**Headings:**
Use headings in order. Each page should have one `h1`, then section-level `h2` headings where needed. Do not use headings only to make text bigger.

**Forms:**
Every input should have a visible label. Required fields should use browser validation or local validation with a clear message.

**Status messages:**
Success and error messages should appear near the action that caused them. Text should explain what happened and what the user can do next when needed.

## Future Ideas

- Replace placeholder tutorial content with real lessons.
- Add folders or setlists to the song library.
- Add a friends' libraries view once sharing rules are fully ready.
- Move articles to Supabase if editing them in code becomes inconvenient.
- Add a final logo/wordmark system.
- Add more detailed copyright help for worship teams.
