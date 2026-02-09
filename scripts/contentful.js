import { queryApiMesh, resolveImageUrl } from './api-mesh-client.js';

async function fetchFromContentful(contentType, queryParams = {}) {
  const typeWithUpper = capitalizeFirst(contentType);

  // Build GraphQL query dynamically based on contentType
  const query = `
    query Get${typeWithUpper}($limit: Int = 1) {
      ${contentType}Collection(limit: $limit) {
        items {
          sys { id }
          ... on ${typeWithUpper} {
            heroBannerHeadline
            internalName
            heroBannerImage {
              url
            }
          }
        }
      }
    }
  `;

  try {
    const data = await queryApiMesh(query, { limit: queryParams.limit || 1 });

    if (!data || !data[`${contentType}Collection`]) {
      return null;
    }

    // Transform to match old response format for backward compatibility
    return {
      items: data[`${contentType}Collection`].items.map((item) => ({
        sys: item.sys,
        fields: {
          heroBannerHeadline: item.heroBannerHeadline,
          internalName: item.internalName,
          heroBannerImage: item.heroBannerImage,
        },
      })),
      includes: {
        Asset: data[`${contentType}Collection`].items
          .filter((item) => item.heroBannerImage)
          .map((item) => ({
            sys: { id: item.sys.id },
            fields: {
              file: {
                url: item.heroBannerImage.url ? item.heroBannerImage.url : '',
              },
            },
          })),
      },
    };
  } catch (error) {
    console.error('Error fetching from Contentful:', error);
    return null;
  }
}

function capitalizeFirst(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function resolveAssetUrl(assetId, includes) {
  if (!includes?.Asset || !assetId) return '';

  const assetItem = includes.Asset.find((item) => item.sys.id === assetId);
  if (assetItem?.fields?.file?.url) {
    return `https:${assetItem.fields.file.url}`;
  }
  return '';
}

export async function loadContentfulSection() {
  const { pathname } = window.location;
  if (pathname !== '/' && pathname !== '/index.html') {
    return;
  }

  try {
    const response = await fetchFromContentful('pageLanding');

    if (!response || !response.items || response.items.length === 0) {
      console.warn('No landing page content found in Contentful');
      return;
    }

    const entry = response.items[0];
    const { fields } = entry;

    const title = fields.heroBannerHeadline || '';
    const internalName = fields.internalName || '';
    const imageUrl = resolveImageUrl(fields.heroBannerImage);

    if (!title && !imageUrl) {
      console.warn('No content to display from Contentful');
      return;
    }

    const section = document.createElement('div');
    section.className = 'contentful-section';
    section.innerHTML = `
      <div class="contentful-wrapper">
        <h2 class="contentful-title">Content from API Mesh (Contentful via GraphQL)</h2>
        <div class="contentful-hero">
          <div class="contentful-hero-content">
            ${imageUrl ? `
              <div class="contentful-hero-image">
                <img src="${imageUrl}" alt="${title}" loading="lazy">
              </div>
            ` : ''}
            <div class="contentful-hero-text">
              <h2>Hero Banner - Headline : ${title}</h2>
              <h2>Internal name  : ${internalName}</h2>
            </div>
          </div>
        </div>
      </div>
    `;

    const footer = document.querySelector('footer');
    if (footer?.parentNode) {
      footer.parentNode.insertBefore(section, footer);
    } else {
      document.body.appendChild(section);
    }

    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = `${window.hlx?.codeBasePath || ''}/blocks/contentful-hero/contentful-hero.css`;
    document.head.appendChild(cssLink);
  } catch (error) {
    console.error('Error loading Contentful section:', error);
  }
}
