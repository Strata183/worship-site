const prayerPoints = [
  {
    id: "drawing-near-confession",
    title: "Drawing Near/Confession",
    bullets: [
      {
        text: "Come before the Father",
        children: [
          "Matthew 7:9-11; Matthew 6:9; 1 Peter 1:17; Hebrews 10:19-23"
        ],
        
      },
      {
        text: "Achknowledge dependance upon the Holy Spirit",
        children: [
          "Placeholder sub-point for slowing down before prayer.",
          "Placeholder sub-point for remembering your dependence on God.",
        ],
      },
      {
        text: "Pray that the Father would recieve this time as worship",
        children: [
          "Placeholder sub-point for slowing down before prayer.",
          "Placeholder sub-point for remembering your dependence on God.",
        ],
      },
      {
        text: "Confess your sin",
        children: [
          "Placeholder sub-point for slowing down before prayer.",
          "Placeholder sub-point for remembering your dependence on God.",
        ],
      },
    ],
  },
  {
    id: "praise-and-thanksgiving",
    title: "Praise and Thanksgiving",
    bullets: [
      {
        text: "Praise God for who He is",
        children: [
          "Placeholder sub-point for God's holiness.",
          "Placeholder sub-point for God's mercy.",
        ],
      },
      {
        text: "Thank God for what He has done",
        children: [
          "Placeholder sub-point for specific answered prayers.",
          "Placeholder sub-point for daily provisions.",
        ],
      },
    ],
  },
  {
    id: "god-centered-petitions",
    title: "God-Centered Petitions",
    bullets: [
      {
        text: "Pray for God's name to be honored",
        children: [
          "Placeholder sub-point for worship in your own life.",
          "Placeholder sub-point for worship in the church.",
        ],
      },
      {
        text: "Pray for God's will to be done",
        children: [
          "Placeholder sub-point for obedience.",
          "Placeholder sub-point for wisdom.",
        ],
      },
    ],
  },
  {
    id: "personal-petitions",
    title: "Personal Petitions",
    bullets: [
      {
        text: "Bring your needs before the Lord",
        children: [
          "Placeholder sub-point for spiritual needs.",
          "Placeholder sub-point for practical needs.",
        ],
      },
      {
        text: "Ask for growth in Christlikeness",
        children: [
          "Placeholder sub-point for humility.",
          "Placeholder sub-point for faithfulness.",
        ],
      },
    ],
  },
  {
    id: "intercessory-prayer",
    title: "Intercessory Prayer",
    bullets: [
      {
        text: "Pray for other believers",
        children: [
          "Placeholder sub-point for family.",
          "Placeholder sub-point for church members.",
        ],
      },
      {
        text: "Pray for ministry and witness",
        children: [
          "Placeholder sub-point for pastors and leaders.",
          "Placeholder sub-point for gospel opportunities.",
        ],
      },
    ],
  },
  {
    id: "meditation",
    title: "Meditation",
    bullets: [
      {
        text: "Reflect on Scripture",
        children: [
          "Placeholder sub-point for a verse or passage.",
          "Placeholder sub-point for what it teaches about God.",
        ],
      },
      {
        text: "Respond to truth in prayer",
        children: [
          "Placeholder sub-point for worship.",
          "Placeholder sub-point for application.",
        ],
      },
    ],
  },
  {
    id: "summarize",
    title: "Summarize",
    bullets: [
      {
        text: "Review what you prayed",
        children: [
          "Placeholder sub-point for main requests.",
          "Placeholder sub-point for convictions or reminders.",
        ],
      },
      {
        text: "Close with trust",
        children: [
          "Placeholder sub-point for resting in God's care.",
          "Placeholder sub-point for committing the day to Him.",
        ],
      },
    ],
  },
];

function PrayerBulletList({ bullets }) {
  return (
    <ul className="prayer-point-list">
      {bullets.map((bullet) => (
        <li key={bullet.text}>
          <span>{bullet.text}</span>
          {bullet.children && (
            <ul>
              {bullet.children.map((child) => (
                <li key={child}>{child}</li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}

function Prayer() {
  return (
    <main className="page page-prayer">
      <section className="prayer-heading">
        <p className="eyebrow">Prayer</p>
        <h1>Guidence for Prayer</h1>
      </section>

      <section className="prayer-layout">
        <aside className="prayer-toc" aria-label="Prayer guide sections">
          <h2>Sections</h2>
          <ol>
            {prayerPoints.map((point) => (
              <li key={point.id}>
                <a href={`#${point.id}`}>{point.title}</a>
              </li>
            ))}
          </ol>
        </aside>

        <div className="prayer-content">
          <section className="prayer-section">
            <p>
              Prayer is one of the most important things we do as Christians maintain our
              relationship with God. I recently listened to a sermon by one of the
              elders, Mike Riccardi, and he presented 7 areas of prayer that we
              should be focusing on and that will direct our prayer time by having a
              proper plan. I wanted to list them here as a practical resource!
            </p>
          </section>

          <section className="prayer-guide" aria-label="Seven areas of prayer">
            {prayerPoints.map((point, index) => (
              <article className="prayer-point" id={point.id} key={point.id}>
                <span className="prayer-point-number">{index + 1}</span>
                <div>
                  <h2>{point.title}</h2>
                  <PrayerBulletList bullets={point.bullets} />
                </div>
              </article>
            ))}
          </section>
        </div>
      </section>
    </main>
  );
}

export default Prayer;
