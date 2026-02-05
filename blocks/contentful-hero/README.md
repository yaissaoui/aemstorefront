# Contentful Hero Block

## Overview

The Contentful Hero Block displays hero banner content fetched from Contentful via Adobe API Mesh. It renders a customizable hero section with an image, title, and description on the homepage.

## Features

- **Dynamic Content**: Fetches content from Contentful CMS in real-time
- **API Mesh Integration**: Uses Adobe API Mesh for centralized API access
- **Responsive Design**: Adapts to different screen sizes
- **Error Handling**: Graceful fallback when content is unavailable
- **Performance**: Lazy loading for images

## Configuration

### Contentful Content Type

This block expects a Contentful content type named `homepageHero` with the following fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | Short text | Yes | Hero headline |
| `description` | Short text | No | Hero subtext/description |
| `image` | Asset (image) | No | Hero background/image |
| `isActive` | Boolean | Yes | Controls visibility |

### GraphQL Query

The block uses the following GraphQL query via API Mesh:

```graphql
query GetHomepageHero($isActive: Boolean = true, $limit: Int = 1) {
  homepageHeroCollection(where: {isActive: $isActive}, limit: $limit) {
    items {
      sys { id }
      title
      description
      image {
        url
      }
      isActive
    }
  }
}
```

## Usage

### Block Definition

Add the block to your page document:

```markdown
## Contentful Hero

Content from Contentful
```

### Behavior

- Only displays on the homepage (`/` or `/index.html`)
- Automatically hides if no active content is found
- Fetches the first active `homepageHero` entry from Contentful
- Renders with CSS classes: `.contentful-hero-content`, `.contentful-hero-image`, `.contentful-hero-text`

## Technical Details

### Dependencies

- `../../scripts/api-mesh-client.js` - API Mesh GraphQL client
- `contentful-hero.css` - Block styling

### API Mesh Integration

The block queries Contentful through Adobe API Mesh at:
```
https://191256-189babybluemink.adobeioruntime.net/api/v1/web/gql
```

### Error Handling

- Network errors: Block is hidden gracefully
- Missing content: Block is hidden gracefully
- Invalid data: Block is hidden gracefully

All errors are logged to the console for debugging.

### Styling

CSS classes applied:
- `.contentful-hero-content` - Container wrapper
- `.contentful-hero-image` - Image container
- `.contentful-hero-text` - Text content container

## Development

### Local Testing

1. Ensure API Mesh is deployed and accessible
2. Create a `homepageHero` entry in Contentful with `isActive: true`
3. Load the homepage to see the hero block

### Content Updates

Content changes in Contentful are reflected immediately (no cache).

## Related Files

- `scripts/contentful.js` - Shared Contentful integration utilities
- `scripts/api-mesh-client.js` - API Mesh GraphQL client
- `blocks/contentful-hero/contentful-hero.css` - Block styles

## Migration Notes

This block was migrated from direct Contentful REST API calls to GraphQL via Adobe API Mesh. The change provides:

- Centralized API authentication
- Better error handling and retry logic
- Foundation for future multi-API mesh integration
- Improved security (credentials managed via API Mesh secrets)
