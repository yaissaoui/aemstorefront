// Contentful API configuration
const CONTENTFUL_SPACE_ID = 'udiawk8vhfaw';
const CONTENTFUL_ACCESS_TOKEN = 'WXdYN9Lrl8wXy86dP5MF6t-t7FtdegQ7HMtQkTO2DuA';
const CONTENTFUL_ENVIRONMENT = 'master';

/**
 * Fetch data from Contentful API
 * @param {string} contentType - The content type ID
 * @param {Object} query - Additional query parameters
 * @returns {Promise<Object>} - Contentful response
 */
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

/**
 * Resolve asset URL from Contentful
 * @param {string} assetId - Asset ID from Contentful
 * @param {Object} includes - Includes object from Contentful response
 * @returns {string} - Asset URL
 */
function resolveAssetUrl(assetId, includes) {
  if (!includes?.Asset || !assetId) return '';

  const assetItem = includes.Asset.find((item) => item.sys.id === assetId);
  if (assetItem?.fields?.file?.url) {
    return `https:${assetItem.fields.file.url}`;
  }
  return '';
}

/**
 * Create the Contentful hero block
 * @param {Element} block - The block element
 */
export default async function decorate(block) {
  // Only show on homepage
  const { pathname } = window.location;
  if (pathname !== '/' && pathname !== '/index.html') {
    block.style.display = 'none';
    return;
  }

  try {
    // Fetch homepage hero content from Contentful
    const response = await fetchFromContentful('homepageHero', {
      'fields.isActive': true,
    });

    if (!response || !response.items || response.items.length === 0) {
      block.style.display = 'none';
      return;
    }

    const entry = response.items[0];
    const { fields } = entry;

    // Extract content
    const title = fields.title || '';
    const description = fields.description || '';
    const imageId = fields.image?.sys?.id;
    const imageUrl = resolveAssetUrl(imageId, response.includes);

    // Create the HTML structure
    const heroContent = document.createElement('div');
    heroContent.className = 'contentful-hero-content';

    // Add image if available
    if (imageUrl) {
      const imageDiv = document.createElement('div');
      imageDiv.className = 'contentful-hero-image';
      const img = document.createElement('img');
      img.src = imageUrl;
      img.alt = title;
      img.loading = 'lazy';
      imageDiv.appendChild(img);
      heroContent.appendChild(imageDiv);
    }

    // Add text content
    const textDiv = document.createElement('div');
    textDiv.className = 'contentful-hero-text';

    if (title) {
      const titleElement = document.createElement('h2');
      titleElement.textContent = title;
      textDiv.appendChild(titleElement);
    }

    if (description) {
      const descriptionElement = document.createElement('p');
      descriptionElement.textContent = description;
      textDiv.appendChild(descriptionElement);
    }

    heroContent.appendChild(textDiv);
    block.appendChild(heroContent);
  } catch (error) {
    console.error('Error decorating Contentful hero block:', error);
    block.style.display = 'none';
  }
}
