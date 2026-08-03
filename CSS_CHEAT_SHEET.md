# CSS Cheat Sheet

Most styling lives in [main.css](src/Styles/main.css). The file is organized by the React file that uses each group of classes.

When making a page, start with shared classes, then add page-specific classes only when you need custom layout.

```jsx
<main className="page page-example">
  <section className="page-heading">
    <p className="eyebrow">Small label</p>
    <h1>Page title</h1>
    <p>Short intro copy.</p>
  </section>
</main>
```

## Global Foundation

Used by every file.

`--color-background`: warm site background.

`--color-text`: main dark text.

`--color-muted`: softer paragraph text.

`--color-nav`: dark navbar/footer base.

`--color-accent`: main green accent for buttons, links, and emphasis.

`--color-accent-light`: pale green used for callouts and soft backgrounds.

`--color-border`: light border for cards, panels, and rows.

`--font-heading`, `--font-body`: app fonts.

`body`, `html`, `#root`: set the base font, background, and full-height layout.

## Components/Navbar.js

`nav`: dark top navigation wrapper.

`nav-content`: three-column nav layout: site title, page links, account/login.

`site-title`: Worthy for Worship brand link.

`account-nav`: right-side account area.

`login-link`: white login button.

`account-menu`: wrapper that controls the account dropdown hover/focus area.

`account-button`: square account icon button.

`account-icon`: CSS-drawn person icon.

`account-dropdown`: dropdown menu with Friends and Sign out.

Use these only in [Navbar.js](src/Components/Navbar.js).

## Components/KoFiWidget.js

This component loads Ko-fi's floating donation widget script and draws the floating `Support me` button.

It does not have local CSS in `main.css`; Ko-fi injects and styles the widget from their script.

Edit `koFiUsername` in [KoFiWidget.js](src/Components/KoFiWidget.js) if the Ko-fi page name changes.

## Shared Page Helpers

Used across several files.

`page`: base wrapper for pages. Centers content, gives responsive padding, and sets max width.

`app-page`: left-aligns app/tool pages like Library and Friends.

`auth-page`: left-aligns the Login page.

`page-heading`: standard intro block for app/tool pages.

`eyebrow`: small uppercase label above headings.

`contact-email-link`: styled email link.

`tutorials-contact-copy`: narrower text on Tutorials.

## Pages/Home.js

`home-hero`: main welcome area.

`home-hero-image`: faint guitar image behind the hero text.

`home-hero-statement`: large worship quote/statement.

`resource-grid`: responsive card grid.

`resource-card`: clickable home page card.

`resource-card-disabled`: non-clickable card state, used when a feature needs setup before it can open.

`resource-card-image`: small image inside a resource card.

`resource-card-image-crop`: add to card images that should fill the image box with cropping.

Home card image example:

```js
{
  title: "Worthy for Song",
  image: "/worthy_for_song.png",
  imageClassName: "resource-card-image-crop",
}
```

The donation card uses `REACT_APP_DONATION_URL` from `.env.local`. See [.env.example](.env.example).

## Pages/About.js

`page-about`: narrower About page wrapper.

`about-hero`: top About intro section.

`about-content`: grid container for About content.

`about-section`: white text section with border and padding.

`about-closing`: highlighted closing/legal section.

`verse-ref`: Scripture/reference callout. Put the reference in a nested `span`.

## Pages/Articles.js

`page-articles`: article page wrapper.

`articles-hero`: intro area on article index.

`article-template-grid`: grid of article cards.

`article-template-card`: clickable article card.

`article-card-action`: “Read article” text.

`article-detail-page`: narrower article detail wrapper.

`article-back-link`: back link from an article.

`article-detail`: article detail layout.

`article-detail-header`: article title and description.

`article-body`: white article text container.

`article-writing-space`: placeholder/error state for missing article text.

## Pages/Steadfast.js

`page-steadfast`: page wrapper.

`steadfast-hero`: centered intro section.

`steadfast-hero-copy`: intro text wrapper.

`steadfast-content`: content grid.

`steadfast-section`: white text section.

`steadfast-callout`: highlighted section variant.

This is a good model for a simple informational page.

## Pages/WorthyForSong.js

`page-worthy`: page wrapper for the album page.

`worthy-album-hero`: two-column album intro with artwork and copy.

`worthy-album-art`: square album artwork image.

`worthy-album-copy`: album title and description text.

`worthy-track-panel`: white panel containing the track list.

`worthy-track-heading`: label and heading above the track list.

`worthy-track-list`: numbered album track list.

`worthy-track-number`: two-digit track number.

`worthy-track-title`: track name.

Edit the `albumTracks` array in [WorthyForSong.js](src/Pages/WorthyForSong.js) to change the track names.

## Pages/VbsKinderMusic.js

`page-vbs`: page wrapper.

`vbs-hero`: white intro panel.

`vbs-hero-copy`: text side of the hero.

`vbs-hero-actions`: action/status side of the hero.

`vbs-password-panel`: password/access form panel.

`vbs-chart-panel`: main chart list panel.

`vbs-panel-heading`: heading row above chart list.

`vbs-chart-list`: list wrapper.

`vbs-chart-row`: one chart row.

`vbs-chart-number`: numbered badge.

`vbs-chart-copy`: title/description text.

`vbs-chart-meta`: small metadata row.

`vbs-chart-key`: key badge.

`vbs-chart-actions`: open/download buttons.

## Components/Footer.js

`site-footer`: footer wrapper.

`footer-content`: inner footer layout.

`footer-contact`: contact line.

`footer-legal`: copyright/legal row.

Use these only in [Footer.js](src/Components/Footer.js).

## Pages/Login.js And Shared Forms

`auth-panel`: white login/sign-up card.

`auth-tabs`: two-button sign-in/sign-up switcher.

`form-stack`: vertical form layout.

`primary-button`: main filled action button.

`text-button`: quiet text action.

`form-message`: base feedback box.

`form-message error`: red error feedback.

`form-message success`: green success feedback.

`row-actions`: row-level button group used by Friends and Library.

`subtle-danger-button`: quiet remove/destructive action used inside `row-actions`.

## Pages/Library.js

`library-page`: wide Songs page wrapper.

`library-shell`: two-column layout with sidebar and browser.

`library-sidebar`: sticky shelf sidebar on desktop.

`library-brand-block`: sidebar title and description.

`library-shelves`: vertical shelf buttons.

`score-browser`: main song list area.

`upload-card-main`: wide upload form shown on My Library.

`library-toolbar`: count/search/sort toolbar.

`friends-library-toolbar`: toolbar variant with the extra Friend filter.

`friends-library-callout`: link back to Friends page for adding friends.

`library-count`: song count in toolbar.

`library-empty-state`: empty/no-results panel.

`empty-state-action`: filled link inside an empty state.

`score-list`: song row list.

`score-open-button`: clickable title/key area.

`score-edit-form`: inline edit fields.

`score-main`: title and subtitle wrapper.

`score-key`: key pill.

`score-actions`: Open/Edit/Delete/Save buttons.

## Pages/Friends.js

`friends-page`: Friends page wrapper.

`friend-dashboard`: top account/add-friend grid.

`friend-summary-card`: white dashboard card.

`friend-workspace`: grid for friends and request panels.

`friend-section`: white panel.

`friend-section-primary`: larger Friends list panel.

`friend-count`: count pill.

`friend-empty-state`: no friends/requests panel.

`friend-list`: friends/request list.

`compact-friend-list`: tighter request-list variant.

`friend-person`: avatar plus name/email.

`friend-avatar`: circular initial avatar.

`status-pill pending`: yellow pending request pill.

`panel-header`: section header with title and action/count.

`empty-state`: simple loading/empty text.

## Creating A New Page

For a new page, use this shape:

```jsx
function WorthyForSong() {
  return (
    <main className="page page-worthy">
      <section className="page-heading">
        <p className="eyebrow">Album</p>
        <h1>Worthy for Song</h1>
        <p>Worthy for Song, Lord willing, will be my first and upcoming album!</p>
      </section>

      <section className="worthy-section">
        <h2>About the album</h2>
        <p>Album details go here.</p>
      </section>
    </main>
  );
}
```

Then add CSS near a `Pages/WorthyForSong.js` section:

```css
.page-worthy {
  max-width: 1040px;
  text-align: left;
}

.worthy-section {
  background-color: white;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1.5rem;
}
```

Rule of thumb: use `page-*` for the main wrapper and `worthy-*` for pieces that only belong to that page.

## Responsive Sections

The bottom of `main.css` has media queries:

`max-width: 900px`: collapses wide grids and sidebars.

`max-width: 640px`: stacks cards, forms, panels, and rows for phones.

`max-width: 560px`: compact navbar and page spacing for very small screens.

When adding new page-specific classes, add mobile rules near the bottom only if the desktop layout does not naturally stack.
