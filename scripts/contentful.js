const CONTENTFUL_SPACE_ID = 'udiawk8vhfaw';
const CONTENTFUL_ACCESS_TOKEN = 'WXdYN9Lrl8wXy86dP5MF6t-t7FtdegQ7HMtQkTO2DuA';
const CONTENTFUL_ENVIRONMENT = 'master';

async function fetchFromContentful(contentType, query = {}) {
  const baseUrl = `https://cdn.contentful.com/spaces/${CONTENTFUL_SPACE_ID}/environments/${CONTENTFUL_ENVIRONMENT}`;
  const params = new URLSearchParams({
    access_token: CONTENTFUL_ACCESS_TOKEN,
    content_type: contentType,
    limit: 1,
    ...query,
  });

  try {
    const response = await fetch(`${baseUrl}/entries?${params}`);
    if (!response.ok) {
      throw new Error(`Contentful API error: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching from Contentful:', error);
    return null;
  }
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
    const description = fields.richText ? 'Découvrez notre collection premium' : '';
    const imageId = fields.heroBannerImage?.sys?.id;
    const imageUrl = resolveAssetUrl(imageId, response.includes);

    if (!title && !imageUrl) {
      console.warn('No content to display from Contentful');
      return;
    }

    const section = document.createElement('div');
    section.className = 'contentful-section';
    section.innerHTML = `
      <div class="contentful-wrapper">
        <h2 class="contentful-title">Content from API Contentful</h2>
        <div class="contentful-hero">
          <div class="contentful-hero-content">
            ${imageUrl ? `
              <div class="contentful-hero-image">
                <img src="${imageUrl}" alt="${title}" loading="lazy">
              </div>
            ` : ''}
            <div class="contentful-hero-text">
              ${title ? `<h2>${title}</h2>` : ''}
              ${description ? `<p>${description}</p>` : ''}
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
