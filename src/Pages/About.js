// About is a simple informational page.
// It does not need state, effects, or database calls because all text is static.
function About() {
  return (
    <main className="page page-about">
      {/* Opening mission statement for the site. */}
      <section className="about-hero">
        <h1>About Worthy for Worship</h1>
        <p>
          Worthy for Worship exists to serve the local church providing
          a place for worship leaders and musicians to share resources
          and to understand what Worship truly is
          so they can effectively apply their gifts to the glory of God.
        </p>
      </section>

      {/* Scripture quotations are grouped in the reusable verse-ref style. */}
      <section className="about-content">
        <p className="verse-ref">
          "Let the word of Christ dwell in you richly, with all wisdom
          teaching and admonishing one another with psalms and hymns
          and spiritual songs, singing with gratefulness in your hearts
          to God."
          <span>Colossians 3:16 (LSB)</span>
        </p>
      
      </section>

      {/* Main explanatory content for visitors who want context and usage rules. */}
      <section className="about-content">
        <p className="verse-ref">
          "Praise Him with trumpet blast; Praise Him with harp and lyre. 
          Praise Him with tambourine and dancing;
          Praise Him with stringed instruments and pipe.
          Praise Him with resounding cymbals;
          Praise Him with clashing cymbals.
          Let everything that has breath praise Yah.""
          Praise Yah!"
          <span>Psalm 150:3-6 (LSB)</span>
        </p>
      
      </section>
      <section className="about-content">
        <p className="verse-ref">
        "Whether, then, you eat or drink or whatever you do, do all to the
        glory of God."
        <span>1 Corinthians 10:31 (LSB)</span>
        </p>

        <section className="about-section">
          <h2>What is the purpose?</h2>
          <p>
            The title, "Worthy for Worship," describes the heart behind this
            site. We are all created for the purpose of worship. Furthermore,
            God is worthy of our worship!
            One specific way we worship is through music, and this site exists to support
            that work with practical tools for the church.
          </p>
        </section>

        <section className="about-section">
          <h2>Why use this site?</h2>
          <p>
            I do not mean to discourage use of other excellent worship resources
            that already exist. However, many are built for a broad category of
            people who come from different churches with different needs.
            My site is spicifically tailored for personal use in the local church. 
            This is helpful because you can share specific arrangements that your church
            is used to or even refer to other peoples song lists to know what songs are 
            acceptable to play on a Sunday morning. 
            
          </p>
          <p>
            Worthy for Worship is focused on the local church and individual
            worship leaders and musicians who want an easy way to share music
            with others.
          </p>
          <p>
            I am building this site originally for my own church and team. 
            Nevertheless I hope it can be an encouragment to others in the 
            universal church as well as I continue to develop and expand. 
          </p>
          <p>
            All glory to Christ, <br></br>
            Derek Smith
          </p>
        </section>
        <section className="about-section">
          <h2>How to use?</h2>
          <p>
            Each account is free and comes with a section for a personal library of songs that
            can only be shared through friend requests. This is intentional because this site is 
            not meant to be free distribution copywrited charts. 
          </p>
          <p>
            It is up to you to create faithful, helpful charts to share with your church!
          </p>
          <p>
            There will also be development on other helpful resouces sourounding worship 
            including tutorials and articles for your free use! 
          </p>
        </section>
         <section className= "about-section">
          <h2>
            What are the rules?
          </h2>
          <p>
            Under the CCLI Church Copyright License and CCLI Rehearsal License, a church is only 
            allowed to distribute digital files (chords, lyrics, sheets) to individuals who are 
            active members of that specific congregation's worship team. 
          </p>
          <p>
            Under CCLI terms, you may only upload chord sheets, lyrics, or custom lead sheets 
            created by your ministry. Scanning and uploading retail sheet music books, piano accompaniments,
            or choral octavos is strictly prohibited.
          </p>
          <p>
            I suggest being very careful in uploading song sheets to make sure you have proper rights to.
            When creating a chart, there must be credit given at the bottom such as a CCLI #.
            The only instance this does not matter is if the song is in the public domain. 
            (all musical compositions published in the United States in or before 1930 are in the public domain)
          </p>
          <p>
            If these rules are not followed properly, I reserve the right to remove your charts from my website.
          </p>
          <p>
            If you have any questions, reach out to me at derek.smith@worthyforworship.com
          </p>
        </section>
        <section className="about-closing">
          <h2>Permission to Quote the LSB</h2>
          <p>
            “Scripture quotations taken from the (LSB®) Legacy Standard Bible®, Copyright © 2021 by The Lockman Foundation. 
            Used by permission. All rights reserved. Managed in partnership with Three Sixteen Publishing Inc.
            LSBible.org and 316publishing.com.”
          </p>
        </section>

      </section>
    </main>
  );
}

export default About;
