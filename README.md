A modern Shopify theme using HTML-first, JavaScript-only-as-needed approach with performance, flexibility, and Online Store 2.0 features built-in.

## Getting Started

1. **Clone Repository**

```bash
git clone https://github.com/lukew618/spawn-site-v1.git
cd spawn-site-v1
```

## Development Workflow

### Local Development

1. **Start Development Server**

```bash
# Active development with hot-reload
shopify theme dev
```

2. **Preview URLs**

- Development URL: `http://127.0.0.1:9292`
- Theme Editor: `http://127.0.0.1:9292/admin/themes/current/editor`
- Preview with test data: Add `?preview_theme_id=YOUR_THEME_ID` to any URL

Development themes use the connected store's data. Work from a current GitHub branch; do not pull the live theme into your checkout.

### Development Commands

1. **Setup Authentication**

shopify auth login --store=your-store.myshopify.com

2. **Run the development server**

shopify theme dev

### Local Development of the Shopify Theme Editor

When running shopify theme dev theme editor is available at:
http://127.0.0.1:9292/admin/themes/current/editor

These commands are configured in your shell profile with:

### Theme Editor Changes

The Shopify GitHub integration commits Theme Editor changes to the connected branch. Fetch that branch from GitHub before editing related settings or templates. If the theme and branch appear out of sync, pull the verified theme into a separate empty directory for comparison, then bring intended changes through a PR.

### Theme Check

shopify theme check

## Publishing

Use a branch and PR for theme code. Check the combined preview and the branch connected to the published theme before merging. Shopify's native GitHub integration syncs the connected branch. Do not use a direct live `shopify theme push` or a GitHub Actions publisher. Caddis approval applies only to writes staged through Caddis, not this Git workflow.

## Theme Architecture

### Layout Structure

The theme uses a standard Online Store 2.0 layout with:

- Header group sections
- Main content sections
- Footer group sections
- Cart drawer (optional)

### Key Sections

- Header (with sticky options)
- Footer
- Collection pages
- Product pages
- Blog articles

## Developer Tools

### Continuous Integration

Every push triggers:

1. **Theme Check**: Validates Liquid syntax and best practices
2. **Lighthouse CI**: Tests performance and accessibility

### Required Secrets

- `LHCI_GITHUB_TOKEN`: For Lighthouse CI reporting
- `GITHUB_TOKEN`: Automatically provided by GitHub

### Theme Check

Run locally:

```bash
shopify theme check
```

## Best Practices

1. **Code Quality**

- HTML-first approach
- JavaScript only when needed
- Server-side rendering with Liquid
- Progressive enhancement

2. **Performance**

- Lazy-loading images
- Minimal JavaScript
- Optimized assets

3. **Development Flow**

- Work in feature branches
- Regular commits
- Fetch current GitHub `main` before starting work
- Document theme editor changes

4. **Theme Editor Usage**

- Changes sync automatically to GitHub
- Fetch editor commits from GitHub before local development
- Coordinate with team on editor usage
- Document significant changes

## Additional Resources

- [Shopify Theme Development](https://shopify.dev/themes)
- [Online Store 2.0](https://shopify.dev/themes/os20)
- [Liquid Reference](https://shopify.dev/api/liquid)
- [Theme Check Documentation](https://shopify.dev/docs/themes/tools/theme-check)
- [GitHub Integration Guide](https://shopify.dev/docs/storefronts/themes/tools/github)
