# WantokJobs Blog / Content Pages Audit — Run 14
**Date**: 2026-02-16 22:50 MYT  
**Compared Against**: Indeed Career Advice, LinkedIn Articles, Medium, Dev.to

## Summary
Blog infrastructure is **EXCELLENT** with minor gaps. Score: **8.5/10**.

### Strengths ✅
- Full blog listing with search + categories (8 categories)
- Article detail page with table of contents
- Scroll spy for active TOC section
- Social sharing (Facebook, Twitter, LinkedIn, Copy Link)
- Related articles sidebar
- SEO optimization (PageHead with meta tags)
- Loading skeletons (not spinners)
- Mock data fallback (works offline during development)
- Author profiles + read time
- Category filtering with pills
- Pagination
- Responsive design
- Empty states

### Issues Found (Minor) ❌
1. **No comments system** (Indeed has this)
2. **No author bio section** on article page (LinkedIn pattern)
3. **No "Save for later" / bookmark** (Medium feature)
4. **No newsletter signup CTA** in articles
5. **No breadcrumbs** (Blog > Category > Article title)
6. **No estimated reading progress bar** (Medium/Dev.to pattern)
7. **No tags** (only categories — should have both)

---

## Detailed Comparison

### Indeed Career Advice
**What WantokJobs matches**:
- ✅ Article categories (Career Advice, Interview Tips, etc.)
- ✅ Featured images
- ✅ Author attribution
- ✅ Read time estimate
- ✅ Related articles
- ✅ Social sharing

**What's missing**:
- ❌ Comments section (disqus/native)
- ❌ Newsletter opt-in
- ❌ Video content support

### LinkedIn Articles
**What WantokJobs matches**:
- ✅ Professional design
- ✅ Category system
- ✅ Social sharing (LinkedIn integration)
- ✅ Author profiles

**What's missing**:
- ❌ Author bio card at bottom
- ❌ Follow author button
- ❌ Reactions (like/celebrate/insightful)

### Medium
**What WantokJobs matches**:
- ✅ Clean reading experience
- ✅ Table of contents
- ✅ Social share buttons
- ✅ Prose typography (prose-lg class)

**What's missing**:
- ❌ Reading progress bar
- ❌ Highlight text to share
- ❌ "Save story" bookmarking
- ❌ Claps/reactions

### Dev.to
**What WantokJobs matches**:
- ✅ Tags/categories
- ✅ Syntax highlighting ready (prose class)
- ✅ Author metadata
- ✅ Related articles

**What's missing**:
- ❌ Series/collection support
- ❌ Discussion threads
- ❌ "Liquid tags" (embeds)

---

## Quick Improvements (30 min each)

### 1. Author Bio Card (Bottom of Article)
```jsx
{/* Author Bio */}
<div className="mt-12 pt-8 border-t border-gray-200">
  <div className="flex items-start gap-4">
    <img 
      src={article.authorAvatar || '/default-avatar.png'} 
      alt={article.author}
      className="w-16 h-16 rounded-full"
    />
    <div>
      <h3 className="font-bold text-lg text-gray-900">{article.author}</h3>
      <p className="text-gray-600 text-sm mb-3">{article.authorBio || 'Career advisor at WantokJobs'}</p>
      <Link to={`/blog/author/${article.authorSlug}`} className="text-primary-600 text-sm font-medium hover:text-primary-700">
        View all articles by {article.author} →
      </Link>
    </div>
  </div>
</div>
```

### 2. Newsletter Signup CTA (End of Article)
```jsx
{/* Newsletter CTA */}
<div className="mt-8 bg-gradient-to-br from-primary-600 to-primary-800 rounded-xl p-8 text-white text-center">
  <div className="text-4xl mb-4">📬</div>
  <h3 className="text-2xl font-bold mb-2">Get career tips in your inbox</h3>
  <p className="text-primary-100 mb-6">
    Weekly insights on PNG job market trends, interview tips, and career advice.
  </p>
  <form className="max-w-md mx-auto flex gap-2">
    <input 
      type="email" 
      placeholder="your@email.com"
      className="flex-1 px-4 py-3 rounded-lg text-gray-900"
    />
    <button className="px-6 py-3 bg-white text-primary-600 font-semibold rounded-lg hover:bg-gray-100">
      Subscribe
    </button>
  </form>
  <p className="text-xs text-primary-200 mt-3">No spam. Unsubscribe anytime.</p>
</div>
```

### 3. Reading Progress Bar (Sticky Top)
```jsx
const [readProgress, setReadProgress] = useState(0);

useEffect(() => {
  const handleScroll = () => {
    const content = contentRef.current;
    if (!content) return;
    
    const scrollTop = window.scrollY;
    const contentTop = content.offsetTop;
    const contentHeight = content.offsetHeight;
    const windowHeight = window.innerHeight;
    
    const progress = Math.min(
      100,
      Math.max(0, ((scrollTop - contentTop + windowHeight) / contentHeight) * 100)
    );
    
    setReadProgress(progress);
  };
  
  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
}, []);

// In JSX (top of page, fixed)
<div className="fixed top-0 left-0 right-0 h-1 bg-gray-200 z-50">
  <div 
    className="h-full bg-primary-600 transition-all duration-150"
    style={{ width: `${readProgress}%` }}
  />
</div>
```

### 4. Breadcrumbs Navigation
```jsx
{/* Breadcrumbs */}
<nav className="text-sm text-gray-600 mb-6">
  <ol className="flex items-center gap-2">
    <li><Link to="/" className="hover:text-primary-600">Home</Link></li>
    <li>/</li>
    <li><Link to="/blog" className="hover:text-primary-600">Blog</Link></li>
    <li>/</li>
    <li><Link to={`/blog?category=${article.category}`} className="hover:text-primary-600">{article.category}</Link></li>
    <li>/</li>
    <li className="text-gray-900">{article.title.substring(0, 50)}...</li>
  </ol>
</nav>
```

### 5. Bookmark/Save Article Feature
```jsx
const [bookmarked, setBookmarked] = useState(false);

const toggleBookmark = async () => {
  try {
    if (bookmarked) {
      await api.delete(`/bookmarks/articles/${article.id}`);
    } else {
      await api.post(`/bookmarks/articles/${article.id}`);
    }
    setBookmarked(!bookmarked);
  } catch (error) {
    console.error('Failed to bookmark:', error);
  }
};

// In article header
<button 
  onClick={toggleBookmark}
  className={`p-2 rounded-lg transition ${bookmarked ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
  title={bookmarked ? 'Remove bookmark' : 'Save for later'}
>
  <Bookmark className={`w-5 h-5 ${bookmarked ? 'fill-current' : ''}`} />
</button>
```

### 6. Tags System (Separate from Categories)
```jsx
// Categories = broad (Career Advice, Industry News)
// Tags = specific (Remote Work, Salary Negotiation, PNG Mining)

<div className="mt-8 pt-8 border-t border-gray-200">
  <div className="flex items-start gap-3">
    <Tag className="w-5 h-5 text-gray-400 mt-0.5" />
    <div>
      <p className="text-sm font-medium text-gray-700 mb-2">Article Tags:</p>
      <div className="flex flex-wrap gap-2">
        {article.tags?.map(tag => (
          <Link
            key={tag}
            to={`/blog/tag/${tag}`}
            className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full hover:bg-primary-100 hover:text-primary-700 transition"
          >
            {tag}
          </Link>
        ))}
      </div>
    </div>
  </div>
</div>
```

---

## Medium-Priority Improvements (1-2 hours each)

### 1. Comments System Integration
**Options**:
- **Disqus** (easiest, 3rd-party hosted, free tier)
- **Native comments** (custom table, moderation required)
- **Facebook Comments Plugin** (good for PNG market, social auth)

**Recommendation**: Start with Disqus, migrate to native later if needed.

```jsx
{/* Disqus Integration */}
<DiscussionEmbed
  shortname='wantokjobs'
  config={{
    url: window.location.href,
    identifier: article.id,
    title: article.title,
  }}
/>
```

### 2. Series/Collection Support
**Use case**: Multi-part articles (e.g., "Resume Writing 101: Part 1 of 5")

```jsx
{article.seriesId && (
  <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
    <h3 className="font-bold text-blue-900 mb-3">📚 Part of a Series</h3>
    <p className="text-sm text-blue-800 mb-4">{article.seriesTitle}</p>
    <div className="space-y-2">
      {seriesArticles.map((a, idx) => (
        <Link
          key={a.id}
          to={`/blog/${a.slug}`}
          className={`block px-4 py-2 rounded ${a.id === article.id ? 'bg-blue-200 font-semibold' : 'bg-white hover:bg-blue-100'}`}
        >
          Part {idx + 1}: {a.title}
        </Link>
      ))}
    </div>
  </div>
)}
```

### 3. Video Content Support
**Use case**: Embed YouTube tutorials, interview tips videos

```jsx
// In article content (rich text editor or markdown)
// Support YouTube embed URLs

const renderContent = (html) => {
  // Replace YouTube URLs with iframes
  return html.replace(
    /https:\/\/www\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/g,
    '<div class="aspect-w-16 aspect-h-9 my-8"><iframe src="https://www.youtube.com/embed/$1" frameborder="0" allowfullscreen></iframe></div>'
  );
};
```

---

## Database Schema for Blog (Already Exists?)

Assuming `articles` table exists with:
- id, title, slug, content, excerpt
- author, author_slug, author_avatar, author_bio
- category, tags (JSON array)
- image, published_at, read_time
- views, status (draft/published)

**Missing columns** (add if needed):
```sql
ALTER TABLE articles ADD COLUMN author_bio TEXT;
ALTER TABLE articles ADD COLUMN author_avatar TEXT;
ALTER TABLE articles ADD COLUMN tags TEXT; -- JSON array
ALTER TABLE articles ADD COLUMN series_id INTEGER;
ALTER TABLE articles ADD COLUMN series_order INTEGER;
ALTER TABLE articles ADD COLUMN video_url TEXT;
ALTER TABLE articles ADD COLUMN enable_comments INTEGER DEFAULT 1;

-- New tables
CREATE TABLE article_bookmarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  article_id INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (article_id) REFERENCES articles(id),
  UNIQUE(user_id, article_id)
);

CREATE TABLE article_series (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
```

---

## PNG Market Optimization

### Content Topics (High Value for PNG Audience)
1. **Mining & Resources Careers** — PNG's largest industry
2. **Port Moresby Job Market** — Capital city focus
3. **Expat vs Local Hiring** — Wage gaps, visa requirements
4. **Papua New Guinea Labor Laws** — Employment Act, leave entitlements
5. **Salary Negotiation in Kina** — PNG-specific advice
6. **Remote Work from PNG** — Internet challenges, timezone considerations
7. **Wantok System at Work** — Cultural workplace dynamics
8. **Skills Gap in PNG** — What employers want vs available talent
9. **Public Sector Jobs** — Government hiring processes
10. **PNG Education → Employment** — University to career pathways

### Localization Features
- **Language**: English (PNG English variants where appropriate)
- **Currency**: Always use PGK (K), not USD
- **Examples**: PNG company names (BSP, Oil Search, Digicel, Airways PNG)
- **Cultural**: Reference Wantok values, community, family obligations
- **Visuals**: Use PNG workplace photos (if available), avoid stock photos of Western offices

---

## SEO Optimization (Already Good)

**Current strengths**:
- ✅ PageHead component with meta tags
- ✅ Semantic HTML (article, h1, etc.)
- ✅ Clean URLs (/blog/slug)
- ✅ Image alt text ready

**Quick wins**:
```jsx
{/* Open Graph tags for social media */}
<PageHead
  title={article.title}
  description={article.excerpt}
  image={article.image} // Add OG image support
  type="article"
  publishedTime={article.publishedAt}
  author={article.author}
/>

{/* JSON-LD structured data */}
<script type="application/ld+json">
{JSON.stringify({
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": article.title,
  "image": article.image,
  "author": {
    "@type": "Person",
    "name": article.author
  },
  "publisher": {
    "@type": "Organization",
    "name": "WantokJobs",
    "logo": {
      "@type": "ImageObject",
      "url": "https://wantokjobs.com/logo.png"
    }
  },
  "datePublished": article.publishedAt,
  "dateModified": article.updatedAt,
  "description": article.excerpt
})}
</script>
```

---

## Files to Modify (7 quick wins)

1. **BlogPost.jsx** — Add author bio, newsletter CTA, reading progress bar, breadcrumbs, bookmark button, tags
2. **Blog.jsx** — Add tag filter pills (separate from categories)
3. **PageHead.jsx** — Add OG image, article meta support
4. **Backend: /api/articles/:slug** — Include author_bio, author_avatar, tags, series info
5. **Backend: /api/bookmarks** — NEW endpoints for save/unsave
6. **Database schema** — Add missing columns (author_bio, tags, series_id, etc.)
7. **Admin: Articles.jsx** — Add tag input, series selector, video URL field

**Total estimated time**: 4 hours (quick wins: 3h, medium: 5h)

---

## Score Comparison

| Feature | WantokJobs | Indeed Career Advice | LinkedIn Articles | Medium | Dev.to |
|---------|-----------|---------------------|-------------------|--------|--------|
| Article listing | ✅ | ✅ | ✅ | ✅ | ✅ |
| Search + categories | ✅ | ✅ | ✅ | ✅ | ✅ |
| Social sharing | ✅ | ✅ | ✅ | ✅ | ✅ |
| Related articles | ✅ | ✅ | ✅ | ✅ | ✅ |
| Author profiles | ⚠️ Partial | ✅ | ✅ | ✅ | ✅ |
| Comments | ❌ | ✅ | ✅ | ✅ | ✅ |
| Bookmarks | ❌ | ✅ | ❌ | ✅ | ✅ |
| Reading progress | ❌ | ❌ | ❌ | ✅ | ✅ |
| Newsletter signup | ❌ | ✅ | ✅ | ✅ | ❌ |
| Tags + categories | ⚠️ Categories only | ✅ | ✅ | ✅ | ✅ |
| SEO optimization | ✅ | ✅ | ✅ | ✅ | ✅ |
| Video support | ❌ | ✅ | ✅ | ✅ | ❌ |
| Series/collections | ❌ | ❌ | ❌ | ✅ | ✅ |

**Score**: 8.5/10 (excellent foundation, minor gaps)  
**Indeed/LinkedIn**: 9/10  
**Medium/Dev.to**: 10/10 (best-in-class content platforms)

---

## Next Run Priority
After blog improvements (or documenting), next review: **Pricing / Credits Page** — Compare against SEEK employer pricing, LinkedIn Recruiter pricing. Check pricing clarity, plan comparison, credit packages, trial transparency, payment methods, invoicing, and overall monetization UX.
