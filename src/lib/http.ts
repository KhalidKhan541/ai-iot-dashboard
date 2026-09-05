export interface HTTPConfig {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
  retries?: number;
  retryDelay?: number;
  retryOn?: number[];
}

export interface RequestConfig extends HTTPConfig {
  method?: string;
  url?: string;
  params?: Record<string, string | number | boolean>;
  data?: unknown;
  signal?: AbortSignal;
  responseType?: "json" | "text" | "blob" | "arrayBuffer";
}

export interface HTTPResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: RequestConfig;
}

export interface HTTPError extends Error {
  status?: number;
  statusText?: string;
  data?: unknown;
  config?: RequestConfig;
  response?: HTTPResponse;
}

export class HTTPClient {
  private config: HTTPConfig;
  private interceptors: {
    request: Array<(config: RequestConfig) => RequestConfig | Promise<RequestConfig>>;
    response: Array<(response: HTTPResponse) => HTTPResponse | Promise<HTTPResponse>>;
    error: Array<(error: HTTPError) => HTTPError | Promise<HTTPError>>;
  };

  constructor(config: HTTPConfig = {}) {
    this.config = {
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      retryOn: [408, 429, 500, 502, 503, 504],
      ...config,
    };

    this.interceptors = {
      request: [],
      response: [],
      error: [],
    };
  }

  use(interceptor: {
    request?: (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
    response?: (response: HTTPResponse) => HTTPResponse | Promise<HTTPResponse>;
    error?: (error: HTTPError) => HTTPError | Promise<HTTPError>;
  }): () => void {
    if (interceptor.request) this.interceptors.request.push(interceptor.request);
    if (interceptor.response) this.interceptors.response.push(interceptor.response);
    if (interceptor.error) this.interceptors.error.push(interceptor.error);

    return () => {
      if (interceptor.request) {
        const idx = this.interceptors.request.indexOf(interceptor.request);
        if (idx !== -1) this.interceptors.request.splice(idx, 1);
      }
      if (interceptor.response) {
        const idx = this.interceptors.response.indexOf(interceptor.response);
        if (idx !== -1) this.interceptors.response.splice(idx, 1);
      }
      if (interceptor.error) {
        const idx = this.interceptors.error.indexOf(interceptor.error);
        if (idx !== -1) this.interceptors.error.splice(idx, 1);
      }
    };
  }

  private async applyRequestInterceptors(
    config: RequestConfig
  ): Promise<RequestConfig> {
    let result = config;
    for (const interceptor of this.interceptors.request) {
      result = await interceptor(result);
    }
    return result;
  }

  private async applyResponseInterceptors(
    response: HTTPResponse
  ): Promise<HTTPResponse> {
    let result = response;
    for (const interceptor of this.interceptors.response) {
      result = await interceptor(result);
    }
    return result;
  }

  private async applyErrorInterceptors(error: HTTPError): Promise<HTTPError> {
    let result = error;
    for (const interceptor of this.interceptors.error) {
      result = await interceptor(result);
    }
    return result;
  }

  private buildURL(
    baseURL: string | undefined,
    url: string,
    params?: Record<string, string | number | boolean>
  ): string {
    let fullURL = baseURL ? `${baseURL.replace(/\/+$/, "")}/${url.replace(/^\/+/, "")}` : url;

    if (params) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        searchParams.set(key, String(value));
      }
      const separator = fullURL.includes("?") ? "&" : "?";
      fullURL += `${separator}${searchParams.toString()}`;
    }

    return fullURL;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async request<T = unknown>(config: RequestConfig): Promise<HTTPResponse<T>> {
    let processedConfig = await this.applyRequestInterceptors({
      ...this.config,
      ...config,
    });

    const {
      url = "",
      method = "GET",
      data,
      signal,
      responseType = "json",
      timeout = this.config.timeout,
      retries = this.config.retries,
      retryDelay = this.config.retryDelay,
      retryOn = this.config.retryOn,
    } = processedConfig;

    const fullURL = this.buildURL(processedConfig.baseURL, url, processedConfig.params);

    let lastError: HTTPError | null = null;
    const maxAttempts = (retries ?? 0) + 1;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = timeout ? setTimeout(() => controller.abort(), timeout) : null;

        if (signal) {
          signal.addEventListener("abort", () => controller.abort());
        }

        const fetchOptions: RequestInit = {
          method: method.toUpperCase(),
          headers: {
            "Content-Type": "application/json",
            ...processedConfig.headers,
          },
          signal: controller.signal,
        };

        if (data && method.toUpperCase() !== "GET") {
          fetchOptions.body = JSON.stringify(data);
        }

        const response = await fetch(fullURL, fetchOptions);

        if (timeoutId) clearTimeout(timeoutId);

        const responseHeaders: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });

        let responseData: T;
        const contentType = responseHeaders["content-type"] ?? "";

        if (responseType === "json" || contentType.includes("application/json")) {
          const text = await response.text();
          responseData = text ? JSON.parse(text) : (undefined as T);
        } else if (responseType === "text") {
          responseData = (await response.text()) as unknown as T;
        } else if (responseType === "blob") {
          responseData = (await response.blob()) as unknown as T;
        } else {
          responseData = (await response.arrayBuffer()) as unknown as T;
        }

        const httpResponse: HTTPResponse<T> = {
          data: responseData,
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
          config: processedConfig,
        };

        if (!response.ok) {
          const error: HTTPError = new Error(
            `Request failed with status ${response.status}`
          );
          error.status = response.status;
          error.statusText = response.statusText;
          error.data = responseData;
          error.config = processedConfig;
          error.response = httpResponse;

          if (retryOn?.includes(response.status) && attempt < maxAttempts - 1) {
            lastError = error;
            await this.sleep(retryDelay * Math.pow(2, attempt));
            continue;
          }

          throw error;
        }

        return this.applyResponseInterceptors(httpResponse) as Promise<HTTPResponse<T>>;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          const timeoutError: HTTPError = new Error("Request timed out");
          timeoutError.config = processedConfig;
          lastError = timeoutError;

          if (attempt < maxAttempts - 1) {
            await this.sleep(retryDelay * Math.pow(2, attempt));
            continue;
          }
        }

        if (error instanceof Error && !("status" in error)) {
          lastError = error as HTTPError;
          if (attempt < maxAttempts - 1) {
            await this.sleep(retryDelay * Math.pow(2, attempt));
            continue;
          }
        }

        throw error;
      }
    }

    throw lastError ?? new Error("Request failed after all retries");
  }

  async get<T = unknown>(
    url: string,
    config?: Partial<RequestConfig>
  ): Promise<HTTPResponse<T>> {
    return this.request<T>({ ...config, url, method: "GET" });
  }

  async post<T = unknown>(
    url: string,
    data?: unknown,
    config?: Partial<RequestConfig>
  ): Promise<HTTPResponse<T>> {
    return this.request<T>({ ...config, url, method: "POST", data });
  }

  async put<T = unknown>(
    url: string,
    data?: unknown,
    config?: Partial<RequestConfig>
  ): Promise<HTTPResponse<T>> {
    return this.request<T>({ ...config, url, method: "PUT", data });
  }

  async patch<T = unknown>(
    url: string,
    data?: unknown,
    config?: Partial<RequestConfig>
  ): Promise<HTTPResponse<T>> {
    return this.request<T>({ ...config, url, method: "PATCH", data });
  }

  async delete<T = unknown>(
    url: string,
    config?: Partial<RequestConfig>
  ): Promise<HTTPResponse<T>> {
    return this.request<T>({ ...config, url, method: "DELETE" });
  }

  async head<T = unknown>(
    url: string,
    config?: Partial<RequestConfig>
  ): Promise<HTTPResponse<T>> {
    return this.request<T>({ ...config, url, method: "HEAD" });
  }

  setHeader(name: string, value: string): void {
    if (!this.config.headers) this.config.headers = {};
    this.config.headers[name] = value;
  }

  removeHeader(name: string): void {
    if (this.config.headers) {
      delete this.config.headers[name];
    }
  }
}

export function createHTTPClient(config?: HTTPConfig): HTTPClient {
  const client = new HTTPClient({
    baseURL: config?.baseURL ?? process.env.NEXT_PUBLIC_API_URL,
    timeout: config?.timeout ?? 30000,
    headers: {
      "Content-Type": "application/json",
      ...config?.headers,
    },
  });

  client.use({
    request: (cfg) => {
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("auth_token");
        if (token) {
          cfg.headers = {
            ...cfg.headers,
            Authorization: `Bearer ${token}`,
          };
        }
      }
      return cfg;
    },
    error: (error) => {
      if (error.status === 401) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("auth_token");
          window.location.href = "/login";
        }
      }
      return error;
    },
  });

  return client;
}

export const httpClient = createHTTPClient();

export function createAPIEndpoint<TParams, TResponse>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  url: string | ((params: TParams) => string)
) {
  return async (
    params?: TParams,
    data?: unknown,
    config?: Partial<RequestConfig>
  ): Promise<HTTPResponse<TResponse>> => {
    const resolvedUrl = typeof url === "function" ? url(params!) : url;
    return httpClient.request<TResponse>({
      ...config,
      url: resolvedUrl,
      method,
      data,
    });
  };
}
