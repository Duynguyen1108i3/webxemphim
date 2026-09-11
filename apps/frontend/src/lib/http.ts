const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();

// Same-origin is the safe default: Vite and Nginx both proxy /api to Express.
// Deployments with a separate API host can opt in through VITE_API_URL.
export const apiBaseUrl = (configuredApiUrl || "/api").replace(/\/$/, "");

export type ApiErrorCode =
  | "OFFLINE"
  | "CONNECTION_FAILED"
  | "TIMEOUT"
  | "INVALID_CREDENTIALS"
  | "ACCOUNT_EXISTS"
  | "ACCOUNT_BANNED"
  | "ACCOUNT_SUSPENDED"
  | "SESSION_EXPIRED"
  | "RATE_LIMITED"
  | "SERVER_ERROR"
  | "REQUEST_FAILED";

export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly status?: number,
    public readonly retryable = false
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ApiErrorPayload = { error?: { code?: string; message?: string } };

const messageForStatus = (status: number, apiCode?: string, backendMessage?: string) => {
  if (status === 401) return new ApiError("INVALID_CREDENTIALS", "Email hoặc mật khẩu không chính xác.", status);
  if (status === 409) return new ApiError("ACCOUNT_EXISTS", "Email đã được sử dụng.", status);
  if (status === 403) return new ApiError("ACCOUNT_BANNED", "Tài khoản đã bị khóa.", status);
  if (status === 404) return new ApiError("REQUEST_FAILED", "Không tìm thấy dịch vụ.", status);
  if (status === 429) return new ApiError("RATE_LIMITED", "Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.", status, true);
  if (status === 422) return new ApiError("REQUEST_FAILED", backendMessage || "Dữ liệu xác thực không hợp lệ.", status);
  if (status === 400) {
    if (backendMessage?.toLowerCase().includes("email")) {
      return new ApiError("REQUEST_FAILED", "Email không hợp lệ.", status);
    }
    return new ApiError("REQUEST_FAILED", "Vui lòng nhập đầy đủ thông tin.", status);
  }
  if (status >= 500) return new ApiError("SERVER_ERROR", backendMessage || "Máy chủ gặp lỗi. Vui lòng thử lại.", status, true);
  return new ApiError("REQUEST_FAILED", backendMessage || "Không thể xử lý yêu cầu. Vui lòng kiểm tra thông tin và thử lại.", status);
};

export async function apiRequest<T>(path: string, options: RequestInit = {}, timeoutMs = 10_000): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      credentials: "include",
      signal: controller.signal,
      headers: { Accept: "application/json", ...options.headers }
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({} as ApiErrorPayload)) as ApiErrorPayload;
      throw messageForStatus(response.status, payload.error?.code, payload.error?.message);
    }

    if (response.status === 204) return undefined as T;

    // A SPA host can return index.html with a 200 status for an unproxied
    // /api request. Parse the body explicitly so that users get an actionable
    // API error instead of the browser's raw "Unexpected token '<'" message.
    const body = await response.text();
    try {
      return JSON.parse(body) as T;
    } catch {
      throw new ApiError(
        "REQUEST_FAILED",
        "M\u00e1y ch\u1ee7 API tr\u1ea3 v\u1ec1 d\u1eef li\u1ec7u kh\u00f4ng h\u1ee3p l\u1ec7. Vui l\u00f2ng ki\u1ec3m tra VITE_API_URL v\u00e0 m\u00e1y ch\u1ee7 backend.",
        response.status,
        response.status >= 500
      );
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (controller.signal.aborted) throw new ApiError("TIMEOUT", "Máy chủ phản hồi quá chậm. Vui lòng thử lại.", undefined, true);
    if (!navigator.onLine) throw new ApiError("OFFLINE", "Mất kết nối Internet.", undefined, true);
    throw new ApiError("CONNECTION_FAILED", "Không thể kết nối tới máy chủ.", undefined, true);
  } finally {
    window.clearTimeout(timeout);
  }
}
