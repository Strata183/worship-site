// Tutorials is currently a placeholder page.
// Later, this could show video lessons, chord walkthroughs, or practice guides.
function Tutorials() {
  return (
    <main className="page">
      <h1>Tutorials</h1>
      <p>Walkthroughs and practice guides will live here.</p>
      <br />
      <p className="tutorials-contact-copy">
        If you have any tutorials that you are working on and think might be
        useful for those practicing for ministry in the church, reach out to me
        at{" "}
        <a
          className="contact-email-link"
          href="mailto:derek.smith@worthyforworship.com"
        >
          derek.smith@worthyforworship.com
        </a>{" "}
        and we can talk about putting them here!
      </p>
    </main>
  );
}

export default Tutorials;
