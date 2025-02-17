// Define the type for the IIIF resource
interface IIIFResource {
  type: string;
  data: any;
}

// Function to fetch the IIIF resource
async function fetchResource(url: string): Promise<IIIFResource> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data: any = await response.json();

    // Check if data.type is "Manifest" or "Collection"
    if (data.type !== "Manifest" && data.type !== "Collection") {
      throw new Error(`Invalid IIIF resource type: ${data.type}`);
    }

    return { type: data.type, data };
  } catch (error) {
    console.error('Error fetching IIIF resource:', error);
    throw error;
  }
}

function parseResource(resource: IIIFResource) {
  if (resource.type === "Manifest") {
    // Handle manifest
    console.log('Manifest:', resource.data);
  } else if (resource.type === "Collection") {
    // Handle collection
    console.log('Collection:', resource.data);
  }
}

const url = 'https://gist.githubusercontent.com/jptmoore/b67cb149bbd11590022db9178cd23843/raw/60828ef3fb7b4cf2dc8ed9ecdd41869296bdf596/copy1.json';

fetchResource(url)
  .then(parseResource)
  .catch(error => console.error('Error:', error));

// Example usage with ts-node maniiifestService.ts