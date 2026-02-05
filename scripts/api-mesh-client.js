/**
 * API Mesh Client for Contentful Integration
 *
 * This module provides a GraphQL client for querying Contentful content
 * through Adobe API Mesh, offering centralized authentication and logging.
 */

const API_MESH_ENDPOINT = 'https://edge-graph.adobe.io/api/19833992-3683-4a0b-a2a4-e71a183d70ab/graphql';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // ms

/**
 * Execute a GraphQL query against API Mesh
 * @param {string} query - GraphQL query string
 * @param {Object} variables - Query variables
 * @param {number} retryCount - Current retry attempt (internal use)
 * @returns {Promise<Object>} - GraphQL response data
 * @throws {Error} - If query fails after all retries
 */
export async function queryApiMesh(query, variables = {}, retryCount = 0) {
  try {
    const response = await fetch(API_MESH_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error(`API Mesh HTTP error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    if (result.errors) {
      const errorMessage = result.errors.map((e) => e.message).join(', ');
      throw new Error(`GraphQL errors: ${errorMessage}`);
    }

    return result.data;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`API Mesh query failed (attempt ${retryCount + 1}/${MAX_RETRIES}):`, error.message);

    // Retry logic for transient errors
    if (retryCount < MAX_RETRIES - 1) {
      // eslint-disable-next-line no-console
      console.log(`Retrying in ${RETRY_DELAY}ms...`);
      await new Promise((resolve) => {
        setTimeout(resolve, RETRY_DELAY);
      });
      return queryApiMesh(query, variables, retryCount + 1);
    }

    throw error;
  }
}

/**
 * Fetch a single entry from Contentful via API Mesh
 * @param {string} contentType - Content type ID (e.g., 'pageLanding', 'homepageHero')
 * @param {Object} filters - Optional filters (e.g., { isActive: true })
 * @param {number} limit - Maximum number of items to return
 * @returns {Promise<Object|null>} - First matching entry or null
 */
export async function fetchContentfulEntry(contentType, filters = {}, limit = 1) {
  const collectionName = `${contentType}Collection`;

  // Build filter arguments
  const filterArgs = Object.entries(filters)
    .map(([key, value]) => {
      const type = typeof value === 'boolean' ? 'Boolean' : 'String';
      return `$${key}: ${type}`;
    })
    .join(', ');

  const filterClause = Object.entries(filters)
    .map(([key, _value]) => `${key}: $${key}`)
    .join(', ');

  const whereArg = filterClause ? `where: { ${filterClause} }` : '';

  const query = `
    query Get${contentType}(${filterArgs ? `${filterArgs}, ` : ''}$limit: Int = ${limit}) {
      ${collectionName}(${whereArg} limit: $limit) {
        items {
          sys {
            id
          }
          ... on ${contentType} {
            title
            description
            image {
              url
            }
          }
        }
      }
    }
  `;

  try {
    const data = await queryApiMesh(query, { ...filters, limit });

    if (!data || !data[collectionName] || !data[collectionName].items) {
      return null;
    }

    return data[collectionName].items[0] || null;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Error fetching ${contentType}:`, error.message);
    return null;
  }
}

/**
 * Resolve asset URL from Contentful entry
 * @param {Object} imageField - Image field from Contentful (containing url property)
 * @returns {string} - Full asset URL or empty string
 */
export function resolveImageUrl(imageField) {
  if (!imageField || !imageField.url) {
    return '';
  }

  // Contentful URLs already include https: protocol
  return imageField.url;
}

/**
 * Check if API Mesh is available
 * @returns {Promise<boolean>} - True if API Mesh is responding
 */
export async function isApiMeshAvailable() {
  try {
    const query = '{ __schema { queryType { name } } }';
    await queryApiMesh(query);
    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('API Mesh health check failed:', error.message);
    return false;
  }
}
