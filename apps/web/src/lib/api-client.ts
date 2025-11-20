/**
 * Generic API client wrapper for making authenticated requests to the backend
 * Handles authentication, error handling, and provides a clean interface
 */

type RequestMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions extends Omit<RequestInit, "body" | "method"> {
  method?: RequestMethod;
  body?: unknown;
  requireAuth?: boolean;
}

interface ApiError {
  message: string;
  status: number;
  data?: unknown;
}

class ApiClientError extends Error {
  status: number;
  data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.data = data;
  }
}

/**
 * Get the base URL for API requests
 */
function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000";
}

/**
 * Parse error response body
 */
async function parseErrorResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type");

  try {
    if (contentType?.includes("application/json")) {
      return await response.json();
    }
    return await response.text();
  } catch {
    return `Failed to parse error response: ${response.status}`;
  }
}

/**
 * Extract error message from error data
 */
function extractErrorMessage(errorData: unknown, status: number): string {
  if (
    typeof errorData === "object" &&
    errorData !== null &&
    "message" in errorData
  ) {
    return String(errorData.message);
  }
  if (typeof errorData === "string") {
    return errorData;
  }
  return `Request failed with status ${status}`;
}

/**
 * Parse successful response body
 */
async function parseSuccessResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return (await response.json()) as T;
  }
  return (await response.text()) as T;
}

/**
 * Generic API client for making authenticated requests
 */
export const apiClient = {
  /**
   * Make an authenticated API request
   */
  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { requireAuth = true, body, ...fetchOptions } = options;

    const url = endpoint.startsWith("http")
      ? endpoint
      : `${getBaseUrl()}${endpoint}`;

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...fetchOptions.headers,
    };

    const config: RequestInit = {
      ...fetchOptions,
      headers,
      credentials: requireAuth ? "include" : "omit",
      body: body ? JSON.stringify(body) : undefined,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await parseErrorResponse(response);
        const errorMessage = extractErrorMessage(errorData, response.status);
        throw new ApiClientError(errorMessage, response.status, errorData);
      }

      return parseSuccessResponse<T>(response);
    } catch (error) {
      if (error instanceof ApiClientError) {
        throw error;
      }

      throw new ApiClientError(
        error instanceof Error ? error.message : "Unknown error occurred",
        0,
        error
      );
    }
  },

  /**
   * GET request
   */
  get<T>(
    endpoint: string,
    options?: Omit<RequestOptions, "method" | "body">
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  },

  /**
   * POST request
   */
  post<T>(
    endpoint: string,
    body?: unknown,
    options?: Omit<RequestOptions, "method" | "body">
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "POST", body });
  },

  /**
   * PUT request
   */
  put<T>(
    endpoint: string,
    body?: unknown,
    options?: Omit<RequestOptions, "method" | "body">
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "PUT", body });
  },

  /**
   * PATCH request
   */
  patch<T>(
    endpoint: string,
    body?: unknown,
    options?: Omit<RequestOptions, "method" | "body">
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "PATCH", body });
  },

  /**
   * DELETE request
   */
  delete<T>(
    endpoint: string,
    options?: Omit<RequestOptions, "method" | "body">
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  },
};

export { ApiClientError };
export type { ApiError };
