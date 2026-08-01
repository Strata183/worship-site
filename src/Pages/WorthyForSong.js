const albumTracks = [
  "Intro",
  "Sweeter Song (Psalm 96)",
  "10,000 Reasons",
  "So I'll Praise",
  "Come Behold the Woundrous Mystery",
  "You are Unchanging",
  "Build my Life"
];

function WorthyForSong() {
  return (
    <main className="page page-worthy">
      <section className="worthy-album-hero">
        <img
          className="worthy-album-art"
          src="/worthy_for_song.png"
          alt="Worthy for Song artwork"
        />

        <div className="worthy-album-copy">
          <p className="eyebrow">Album</p>
          <h1>Worthy for Song</h1>
          <p>
            Worthy for Song, Lord willing, will be my first and upcoming album!
          </p>
        </div>
      </section>

      <section className="worthy-track-panel" aria-label="Worthy for Song tracks">
        <div className="worthy-track-heading">
          <p className="eyebrow">Track list</p>
          <br></br>
          <h2>Songs</h2>
        </div>

        <ol className="worthy-track-list">
          {albumTracks.map((trackTitle, index) => (
            <li key={`${trackTitle}-${index}`}>
              <span className="worthy-track-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="worthy-track-title">{trackTitle}</span>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}

export default WorthyForSong;
