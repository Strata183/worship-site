import { Link, useParams } from "react-router-dom";

const articles = [
    {
        slug: "what-is-worship",
        name: "What is worship?",
        description: "A biblical look at worship and why it reaches beyond music.",
        body: ""
    },
    {
        slug: "are-we-required-to-sing-at-church",
        name: "Are we required to sing at church?",
        description: "A study on why congregational singing matters when the church gathers.",
        body: ""
    }
];

// Articles are currently written here.
// Add each article's text to the body field above.
function Articles() {
    const { articleSlug } = useParams();
    const selectedArticle = articles.find((article) => article.slug === articleSlug);

    if (articleSlug && !selectedArticle) {
        return (
            <main className="page page-articles article-detail-page">
                <Link className="article-back-link" to="/articles">Back to articles</Link>
                <section className="article-detail-header">
                    <p className="eyebrow">Article not found</p>
                    <h1>This article does not exist.</h1>
                    <p>Choose one of the available articles and start there.</p>
                </section>
            </main>
        );
    }

    if (selectedArticle) {
        return (
            <main className="page page-articles article-detail-page">
                <Link className="article-back-link" to="/articles">Back to articles</Link>

                <article className="article-detail">
                    <header className="article-detail-header">
                        <p className="eyebrow">Article</p>
                        <h1>{selectedArticle.name}</h1>
                        <p>{selectedArticle.description}</p>
                    </header>

                    <section className="article-body">
                        {selectedArticle.body ? (
                            selectedArticle.body.split("\n\n").map((paragraph) => (
                                <p key={paragraph}>{paragraph}</p>
                            ))
                        ) : (
                            <section className="article-writing-space">
                                <h2>Article draft</h2>
                                <p>
                                    Write this article in the body field for this article
                                    inside Articles.js.
                                </p>
                            </section>
                        )}
                    </section>
                </article>
            </main>
        );
    }

    return (
        <main className="page page-articles">
            <section className="articles-hero">
                <h1>Worship articles for the local church</h1>
                <p>
                    Read short studies and reflections surrounding biblical worship
                </p>
            </section>

            <section className="article-template-grid" aria-label="Articles">
                {articles.map((article) => (
                    <Link
                        className="article-template-card"
                        key={article.slug}
                        to={`/articles/${article.slug}`}
                    >
                        <div>
                            <h2>{article.name}</h2>
                            <p>{article.description}</p>
                        </div>

                        <span className="article-card-action">Read article</span>
                    </Link>
                ))}
            </section>
        </main>
    );
}

export default Articles;
