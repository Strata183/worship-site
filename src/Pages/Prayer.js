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
        text: "Acknowledge dependence upon the Holy Spirit",
        children: [
          "Romans 8",
        ],
      },
      {
        text: "Pray that the Father would receive this time as worship",
        children: [
          "Psalm 104:34; Psalm 141:2",
        ],
      },
      {
        text: "Confess your sin",
        children: [
          "1 John 1:7,9; Psalm 66:18; 1 Peter 3:7; Matthew 6:12",
        ],
      },
    ],
  },
  {
    id: "praise-and-thanksgiving",
    title: "Praise and Thanksgiving",
    bullets: [
      {
        text: "Delight in all the God is for you in Christ",
        children: [
          "Psalm 37:4; Psalm 32:11; Psalm 40:16; Psalm 90:14",
        ],
      },
      {
        text: "Meditate on the beauty of His manifold perfections",
        children: [
          "Psalm 145:3-9",
        ],
      },
      {
        text: "Meditate on His wondrous deeds throughout the ages",
        children: [
          "Psalm 145:4-5; Psalm 111:2; Psalm 105, 107",
        ],
      },
      {
        text: "Ascribe to the Lord glory due His name",
        children: [
          "Psalm 96",
        ],
      },
      {
        text: "Honor Him as God by giving thanks",
        children: [
          "Romans 1:21; 1 Thessalonians 5:17-18; James 1:17",
        ],
      },
    ],
  },
  {
    id: "god-centered-petitions",
    title: "God-Centered Petitions",
    bullets: [
      {
        text: "Pray for God's name to be glorified above all things by all peoples",
        children: [
          "Matthew 6:9",
        ],
      },
      {
        text: "Pray for His kingdom to increase through the ministry of the church",
        children: [
          "Matthew 6:10",
          "Salvation, second-coming of Christ"
        ],
      },
      {
        text: "Pray for His will to be done",
        children: [

        ],
      },
    ],
  },
  {
    id: "personal-petitions",
    title: "Personal Petitions",
    bullets: [
      {
        text: "Pray for growth in godliness",
        children: [
          
        ],
      },
      {
        text: "Pray for opportunities of personal ministry",
        children: [
     
        ],
      },
      {
        text: "Pray for God to continue to provide for your daily necessities",
        children: [
          "Continued dependence every single day",
        ],
      },
      {
        text: "Pray for freedom from temptation",
        children: [
         
        ],
      },
      {
        text: "Pray for strength to persevere",
        children: [
          "Affliction with You is better than no affliction without You",
        ],
      },
    ],
  },
  {
    id: "intercessory-prayer",
    title: "Intercessory Prayer (example structure)",
    bullets: [
      {
        text: "Monday",
        children: [
          "Pray for: Immediate/Extended family",
        ],
      },
      {
        text: "Tuesday",
        children: [
          "Pray for: Small group from Bible study",
        ],
      },
      {
        text: "Wednesday",
        children: [
          "Pray for: Pastors, Elders, Missionaries",
        ],
      },
      {
        text: "Thursday",
        children: [
          "Pray for: Co-workers",
        ],
      },
      {
        text: "Friday",
        children: [
          "Pray for: Other friends",
        ],
      },
    ],
  },
  {
    id: "meditation",
    title: "Meditation (Pray through Scripture)",
    bullets: [
      {
        text: "Not a random passage",
        children: [
        
        ],
      },
      {
        text: "Maybe main/supplemental texts from your pastor's sermons along with review from sermon notes",
        children: [
          "Imagine if your pastor knew that you had spent prayer time through the materials that he spent 10's of hours a week studying",
        ],
      },
            {
        text: "Maybe a Psalm a day",
        children: [
         
        ],
      },
            {
        text: "Devotion guide",
        children: [
          "ex. Be Thou My Vision: A Liturgy for Daily Worship (Gibson)",
        ],
      },
    ],
  },
  {
    id: "summarize",
    title: "Summarize",
    bullets: [
      {
        text: "Thank God for the time spent in His word",
        children: [
          "Psalm 27:4",
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
        <h1>Guidance for Prayer</h1>
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
              Prayer is a privilege for the Christian to maintain a
              relationship with God. I recently listened to a sermon by one of my
              elders, Mike Riccardi, and he presented 7 areas of prayer that we
              should be focusing on and that will direct our prayer time by having a
              proper plan. I wanted to list them here as a practical resource!
            </p>
            <p className="prayer-credit">
              Adapted from a sermon by Mike Riccardi.{" "}
              <a
                href="https://gracechurch.org/sermons/25281"
                rel="noopener noreferrer"
                target="_blank"
              >
                Listen to the sermon
              </a>
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
