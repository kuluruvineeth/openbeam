import { baseUrl } from "@/lib/urls";

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

async function parseSuccessResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return (await response.json()) as T;
  }
  return (await response.text()) as T;
}

export const apiClient = {
  /**
   * Make an authenticated API request
   */
  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { requireAuth = true, body, ...fetchOptions } = options;

    const url = endpoint.startsWith("http")
      ? endpoint
      : `${baseUrl}${endpoint}`;

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

  get<T>(
    endpoint: string,
    options?: Omit<RequestOptions, "method" | "body">
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  },

  post<T>(
    endpoint: string,
    body?: unknown,
    options?: Omit<RequestOptions, "method" | "body">
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "POST", body });
  },

  put<T>(
    endpoint: string,
    body?: unknown,
    options?: Omit<RequestOptions, "method" | "body">
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "PUT", body });
  },

  patch<T>(
    endpoint: string,
    body?: unknown,
    options?: Omit<RequestOptions, "method" | "body">
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "PATCH", body });
  },

  delete<T>(
    endpoint: string,
    options?: Omit<RequestOptions, "method" | "body">
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  },
};

export { ApiClientError };
export type { ApiError };
