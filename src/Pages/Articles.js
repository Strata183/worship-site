import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import articles from "../Data/articles";

// Long article drafts live in public/articles as plain text files.
// Paragraphs are separated by blank lines because the detail view splits text on "\n\n".
function Articles() {
    // articleSlug comes from the dynamic route in App.js:
    // /articles/:articleSlug
    const { articleSlug } = useParams();

    // If there is a slug in the URL, try to find the matching article object.
    // When there is no slug, this stays undefined and the page shows the index.
    const selectedArticle = articles.find((article) => article.slug === articleSlug);
    const [articleBody, setArticleBody] = useState("");
    const [articleLoadError, setArticleLoadError] = useState(false);

    useEffect(() => {
        let ignoreResponse = false;

        setArticleBody("");
        setArticleLoadError(false);

        if (!selectedArticle?.bodyPath) {
            return () => {
                ignoreResponse = true;
            };
        }

        fetch(selectedArticle.bodyPath)
            .then((response) => {
                if (!response.ok) {
                    throw new Error("Article file could not be loaded.");
                }

                return response.text();
            })
            .then((text) => {
                if (!ignoreResponse) {
                    setArticleBody(text.trim());
                }
            })
            .catch(() => {
                if (!ignoreResponse) {
                    setArticleLoadError(true);
                }
            });

        return () => {
            ignoreResponse = true;
        };
    }, [selectedArticle]);

    // This branch catches typed or outdated article links.
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

    // Detail page for one article.
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
                        {articleBody ? (
                            articleBody.split(/\n\s*\n/).map((paragraph) => (
                                <p key={paragraph}>{paragraph}</p>
                            ))
                        ) : articleLoadError ? (
                            <section className="article-writing-space">
                                <h2>Article file not found</h2>
                                <p>
                                    Check the bodyPath for this article in src/Data/articles.js.
                                </p>
                            </section>
                        ) : (
                            <section className="article-writing-space">
                                <h2>Article draft</h2>
                                <p>
                                    Write this article in its plain text file inside
                                    public/articles.
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
                <h1>Worship Articles</h1>
                <p>
                    Read short studies and reflections surrounding biblical worship
                </p>
            </section>

            <section className="article-template-grid" aria-label="Articles">
                {/* Build the article index from the articles array above. */}
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
