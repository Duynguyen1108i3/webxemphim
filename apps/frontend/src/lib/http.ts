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

const messageForStatus = (status: number, apiCode?: string) => {
  if (apiCode === "INVALID_CREDENTIALS" || status === 401) return new ApiError("INVALID_CREDENTIALS", "Email hoặc mật khẩu không chính xác.", status);
  if (apiCode === "ACCOUNT_EXISTS" || status === 409) return new ApiError("ACCOUNT_EXISTS", "Email hoặc tên tài khoản đã được đăng ký.", status);
  if (apiCode === "ACCOUNT_BANNED") return new ApiError("ACCOUNT_BANNED", "Tài khoản này đã bị khóa.", status);
  if (apiCode === "ACCOUNT_SUSPENDED") return new ApiError("ACCOUNT_SUSPENDED", "Tài khoản này đang tạm ngưng.", status);
  if (apiCode === "EBADCSRFTOKEN") return new ApiError("SESSION_EXPIRED", "Phiên làm việc đã hết hạn. Vui lòng thử lại.", status, true);
  if (status === 429) return new ApiError("RATE_LIMITED", "Bạn đã thử quá nhiều lần. Vui lòng chờ rồi thử lại.", status, true);
  if (status >= 500) return new ApiError("SERVER_ERROR", "Máy chủ gặp lỗi. Vui lòng thử lại.", status, true);
  return new ApiError("REQUEST_FAILED", "Không thể xử lý yêu cầu. Vui lòng kiểm tra thông tin và thử lại.", status);
};

export async function apiRequest<T>(path: string, options: RequestInit = {}, timeoutMs = 15_000): Promise<T> {
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
      throw messageForStatus(response.status, payload.error?.code);
    }

    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (controller.signal.aborted) throw new ApiError("TIMEOUT", "Máy chủ phản hồi quá chậm. Vui lòng thử lại.", undefined, true);
    if (!navigator.onLine) throw new ApiError("OFFLINE", "Mất kết nối Internet.", undefined, true);
    throw new ApiError("CONNECTION_FAILED", "Không thể kết nối tới máy chủ.", undefined, true);
  } finally {
    window.clearTimeout(timeout);
  }
}
