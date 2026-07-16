/**
 * HUMANgo Blog System
 * Markdown Parser + Tag Filtering + Related Articles
 */

// Simple Markdown to HTML converter
const markdownToHtml = (md) => {
  let html = md;
  // Code blocks
  html = html.replace(/```([^`]+)```/g, '<pre><code>$1</code></pre>');
  // Headers
  html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.*?)_/g, '<em>$1</em>');
  // Links
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');
  // Lists
  html = html.replace(/^\- (.*?)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*?<\/li>)/s, '<ul>$1</ul>');
  html = html.replace(/^\d+\. (.*?)$/gm, '<li>$1</li>');
  // Line breaks
  html = html.replace(/\n\n/g, '</p><p>');
  html = '<p>' + html + '</p>';
  return html;
};
// Parse YAML front matter
const parseFrontMatter = (content) => {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, content: content };

  const metaStr = match[1];
  const bodyStr = match[2];

  const meta = {};
  metaStr.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split(':');
    let value = valueParts.join(':').trim();

    // Remove quotes
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }

    // Parse arrays (tags)
    if (value.startsWith('[') && value.endsWith(']')) {
      value = value.slice(1, -1).split(',').map(v => v.trim().replace(/"/g, ''));
    }

    meta[key.trim()] = value;
  });

  return { meta, content: bodyStr };
};

// Blog Data Manager
class BlogSystem {
  constructor() {
    this.articles = [];
    this.allTags = [];
  }

  // Load article from markdown content
  loadArticle(markdownContent) {
    const { meta, content } = parseFrontMatter(markdownContent);
    const article = {
      id: meta.id || `article-${Date.now()}`,
      title: meta.title || 'Untitled',
      date: meta.date || new Date().toISOString().split('T')[0],
      author: meta.author || 'Unknown',
      tags: meta.tags || [],
      excerpt: meta.excerpt || content.substring(0, 150) + '...',
      content: content,
      contentHtml: markdownToHtml(content)
    };

    this.articles.push(article);
    this.updateTags();

    return article;
  }

  // Update tag list
  updateTags() {
    const tagSet = new Set();
    this.articles.forEach(article => {
      article.tags.forEach(tag => tagSet.add(tag));
    });
    this.allTags = Array.from(tagSet).sort();
  }

  // Get all articles
  getAllArticles() {
    return this.articles.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  // Filter articles by tag
  filterByTag(tag) {
    return this.articles.filter(article => article.tags.includes(tag));
  }

  // Get article by ID
  getArticleById(id) {
    return this.articles.find(article => article.id === id);
  }

  // Get related articles (same tags, excluding current)
  getRelatedArticles(articleId, limit = 3) {
    const article = this.getArticleById(articleId);
    if (!article) return [];

    const related = this.articles
      .filter(a => a.id !== articleId)
      .map(a => ({
        article: a,
        commonTags: a.tags.filter(tag => article.tags.includes(tag)).length
      }))
      .sort((a, b) => b.commonTags - a.commonTags)
      .slice(0, limit)
      .map(item => item.article);

    return related;
  }

  // Search articles
  search(query) {
    const q = query.toLowerCase();
    return this.articles.filter(a =>
      a.title.toLowerCase().includes(q) ||
      a.excerpt.toLowerCase().includes(q)
    );
  }
}

// Initialize global blog system
window.Blog = new BlogSystem();

// Fetch and load article from file
const loadArticleFromFile = async (filename) => {
  try {
    const response = await fetch(`/articles/${filename}`);
    const content = await response.text();
    return window.Blog.loadArticle(content);
  } catch (error) {
    console.error('Error loading article:', error);
    return null;
  }
};

// Render article list
const renderArticleList = (articles, containerId) => {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = articles.map(article => `
    <div class="article-card">
      <div class="article-header">
        <h3><a href="/Humango/article.html?id=${article.id}">${article.title}</a></h3>
        <div class="article-meta">
          <span class="article-date">${article.date}</span>
          <span class="article-author">โดย ${article.author}</span>
        </div>
      </div>
      <p class="article-excerpt">${article.excerpt}</p>
      <div class="article-tags">
        ${article.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
      </div>
      <a href="/article.html?id=${article.id}" class="read-more">อ่านเพิ่มเติม →</a>
    </div>
  `).join('');
};

// Render single article
const renderArticle = (article, containerId) => {
  const container = document.getElementById(containerId);
  if (!container || !article) return;

  container.innerHTML = `
    <div class="article-full">
      <div class="article-header-full">
        <h1>${article.title}</h1>
        <div class="article-meta-full">
          <span>${article.date}</span>
          <span>โดย ${article.author}</span>
        </div>
        <div class="article-tags">
          ${article.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
        </div>
      </div>
      <div class="article-content">
        ${article.contentHtml}
      </div>
    </div>
  `;
};

// Render related articles
const renderRelatedArticles = (articles, containerId) => {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (articles.length === 0) {
    container.innerHTML = '<p>ไม่มีบทความที่เกี่ยวข้อง</p>';
    return;
  }

  container.innerHTML = `
    <h3>บทความที่เกี่ยวข้อง</h3>
    <div class="related-articles">
      ${articles.map(article => `
        <div class="related-card">
          <h4><a href="/article.html?id=${article.id}">${article.title}</a></h4>
          <p>${article.excerpt}</p>
          <a href="/article.html?id=${article.id}" class="read-more">อ่าน →</a>
        </div>
      `).join('')}
    </div>
  `;
};

// Render tag filter
const renderTagFilter = (tags, containerId, onTagClick) => {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="tag-filter">
      <button class="tag-btn active" data-tag="all">ทั้งหมด</button>
      ${tags.map(tag => `
        <button class="tag-btn" data-tag="${tag}">${tag}</button>
      `).join('')}
    </div>
  `;

  container.querySelectorAll('.tag-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (onTagClick) onTagClick(btn.dataset.tag);
    });
  });
};

// Get URL parameter
const getUrlParam = (name) => {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
};

// Export for use
window.BlogUtils = {
  markdownToHtml,
  parseFrontMatter,
  loadArticleFromFile,
  renderArticleList,
  renderArticle,
  renderRelatedArticles,
  renderTagFilter,
  getUrlParam
};
