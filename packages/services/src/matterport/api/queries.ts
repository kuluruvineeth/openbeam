export const LIST_MODELS_QUERY = `
  query ListModels($offset: Int, $limit: Int) {
    models(offset: $offset, limit: $limit) {
      results {
        id
        name
        description
        created
        modified
        status
        visibility
        address {
          line1
          city
          state
          country
          lat: latitude
          lng: longitude
        }
        summary {
          rooms
          floors
          area: totalArea
        }
      }
      totalResults
    }
  }
`;

export const GET_MODEL_DETAILS_QUERY = `
  query GetModelDetails($modelId: ID!) {
    model(id: $modelId) {
      id
      name
      description
      created
      modified
      status
      visibility
      address {
        line1
        city
        state
        country
        lat: latitude
        lng: longitude
      }
      summary {
        rooms
        floors
        area: totalArea
      }
      floors {
        id
        label
        rooms {
          id
          label
          floorArea
          floorPosition { x y z }
          center { x y z }
          bounds {
            min { x y z }
            max { x y z }
          }
          floor { id label }
        }
      }
      mattertags {
        id
        label
        description
        position { x y z }
        anchorNormal { x y z }
        color
        mediaType
        mediaSrc
      }
      sweeps {
        id
        position { x y z }
        rotation { x y z }
        floor { id label }
        room { id label }
        neighbors
      }
    }
  }
`;

export interface ListModelsResponse {
  models: {
    results: {
      id: string;
      name: string;
      description?: string;
      created: string;
      modified: string;
      status: string;
      visibility: string;
      address?: {
        line1?: string;
        city?: string;
        state?: string;
        country?: string;
        lat?: number;
        lng?: number;
      };
      summary?: {
        rooms: number;
        floors: number;
        area: number;
      };
    }[];
    totalResults: number;
  };
}

export interface GetModelDetailsResponse {
  model: {
    id: string;
    name: string;
    description?: string;
    created: string;
    modified: string;
    status: string;
    visibility: string;
    address?: {
      line1?: string;
      city?: string;
      state?: string;
      country?: string;
      lat?: number;
      lng?: number;
    };
    summary?: {
      rooms: number;
      floors: number;
      area: number;
    };
    floors: {
      id: string;
      label: string;
      rooms: {
        id: string;
        label: string;
        floorArea: number;
        floorPosition: { x: number; y: number; z: number };
        center: { x: number; y: number; z: number };
        bounds: {
          min: { x: number; y: number; z: number };
          max: { x: number; y: number; z: number };
        };
        floor?: { id: string; label: string };
      }[];
    }[];
    mattertags: {
      id: string;
      label: string;
      description?: string;
      position: { x: number; y: number; z: number };
      anchorNormal?: { x: number; y: number; z: number };
      color?: string;
      mediaType?: string;
      mediaSrc?: string;
    }[];
    sweeps: {
      id: string;
      position: { x: number; y: number; z: number };
      rotation: { x: number; y: number; z: number };
      floor?: { id: string; label: string };
      room?: { id: string; label: string };
      neighbors: string[];
    }[];
  };
}
