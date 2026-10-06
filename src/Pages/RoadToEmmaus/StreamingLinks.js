function SpotifyIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32">
      <circle cx="16" cy="16" fill="#1ed760" r="15" />
      <path
        d="M8 12.2c5.2-1.5 11.8-.9 16 1.7M9.1 16.1c4.4-1.2 9.8-.7 13.6 1.5m-12.3 2c3.5-.9 7.8-.5 10.8 1.2"
        fill="none"
        stroke="#14241a"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function YouTubeMusicIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32">
      <rect fill="#ff0033" height="22" rx="7" width="30" x="1" y="5" />
      <path d="m13 10 9 6-9 6z" fill="#fff" />
    </svg>
  );
}

function AppleMusicIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32">
      <defs>
        <linearGradient id="apple-music-gradient" x1="0" x2="1" y1="1" y2="0">
          <stop offset="0" stopColor="#fa233b" />
          <stop offset="1" stopColor="#fb5c74" />
        </linearGradient>
      </defs>
      <path
        d="M24 5.5v17.2a4.3 4.3 0 1 1-2-3.6V11l-9 2v12a4.3 4.3 0 1 1-2-3.6V10.1L24 7z"
        fill="url(#apple-music-gradient)"
      />
    </svg>
  );
}

function StreamingPlatform({ href, icon, name }) {
  const content = (
    <>
      {icon}
      <span className="album-streaming-label">
        <strong>{name}</strong>
        <small>{href ? "Listen now" : "Coming soon"}</small>
      </span>
    </>
  );

  if (!href) {
    return <span className="album-streaming-platform">{content}</span>;
  }

  return (
    <a
      className="album-streaming-platform"
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      {content}
    </a>
  );
}

function StreamingLinks({
  spotifyUrl = "",
  youtubeMusicUrl = "",
  appleMusicUrl = "",
}) {
  return (
    <div className="album-streaming-links" role="group" aria-label="Streaming platforms">
      <StreamingPlatform
        href={spotifyUrl}
        icon={<SpotifyIcon />}
        name="Spotify"
      />
      <StreamingPlatform
        href={youtubeMusicUrl}
        icon={<YouTubeMusicIcon />}
        name="YouTube Music"
      />
      <StreamingPlatform
        href={appleMusicUrl}
        icon={<AppleMusicIcon />}
        name="Apple Music"
      />
    </div>
  );
}

export default StreamingLinks;
