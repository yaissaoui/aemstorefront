import { queryApiMesh, resolveImageUrl } from '../../scripts/api-mesh-client.js';

/**
 * Fetch data from Contentful via API Mesh GraphQL
 * @param {boolean} isActive - Filter by active status
 * @param {number} limit - Maximum number of items to return
 * @returns {Promise<Object|null>} - Homepage hero data
 */
async function fetchFromContentful(isActive = true, limit = 1) {
  const query = `
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
  `;

  try {
    const data = await queryApiMesh(query, { isActive, limit });

    if (!data || !data.homepageHeroCollection || !data.homepageHeroCollection.items) {
      return null;
    }

    return data.homepageHeroCollection.items[0] || null;
  } catch (error) {
    console.error('Error fetching from Contentful:', error);
    return null;
  }
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
    const entry = await fetchFromContentful(true, 1);

    if (!entry) {
      block.style.display = 'none';
      return;
    }

    // Extract content
    const title = entry.title || '';
    const description = entry.description || '';
    const imageUrl = resolveImageUrl(entry.image);

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
