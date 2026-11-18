import axios from 'axios';

/**
 * 4 khóa localStorage hoàn toàn độc lập:
 * Giúp giảng viên / sinh viên mở đồng thời 3 tab trình duyệt (/, /staff, /admin)
 * đăng nhập 3 tài khoản khác vai trò cùng lúc mà KHÔNG ghi đè phiên của nhau.
 */
export const STORAGE_KEYS = {
  CUSTOMER: 'lumiere_customer_auth',
  STAFF: 'lumiere_staff_auth',
  ADMIN: 'lumiere_admin_auth',
  CART: 'lumiere_cart',
};

export const AUTH_EXPIRED_EVENT = 'lumiere:auth-expired';

const API_BASE_URL = import.meta.env?.VITE_API_URL || '/api';

/**
 * Đọc thông tin phiên đăng nhập ({ token, user }) của từng cổng từ localStorage
 * @param {'CUSTOMER' | 'STAFF' | 'ADMIN'} portal
 */
export function readPortalSession(portal) {
  const storageKey = STORAGE_KEYS[portal];
  if (!storageKey || typeof window === 'undefined') {
    return { token: null, user: null };
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return { token: null, user: null };

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.token) {
      window.localStorage.removeItem(storageKey);
      return { token: null, user: null };
    }

    return {
      token: parsed.token,
      user: parsed.user || null,
    };
  } catch {
    window.localStorage.removeItem(storageKey);
    return { token: null, user: null };
  }
}

/**
 * Lưu phiên đăng nhập ({ token, user }) vào đúng khóa localStorage của cổng tương ứng
 * @param {'CUSTOMER' | 'STAFF' | 'ADMIN'} portal
 * @param {{ token: string, user: object }} session
 */
export function writePortalSession(portal, session) {
  const storageKey = STORAGE_KEYS[portal];
  if (!storageKey || typeof window === 'undefined') return;

  if (!session || !session.token) {
    window.localStorage.removeItem(storageKey);
    return;
  }

  window.localStorage.setItem(
    storageKey,
    JSON.stringify({
      token: session.token,
      user: session.user || null,
    })
  );
}

/**
 * Xóa phiên đăng nhập của riêng 1 cổng (không ảnh hưởng 2 cổng còn lại)
 * @param {'CUSTOMER' | 'STAFF' | 'ADMIN'} portal
 */
export function clearPortalSession(portal) {
  const storageKey = STORAGE_KEYS[portal];
  if (!storageKey || typeof window === 'undefined') return;
  window.localStorage.removeItem(storageKey);
}

/**
 * Kiểm tra lỗi do hủy request chủ động qua AbortController (không hiển thị Toast báo lỗi giả)
 */
export function isCanceledRequest(error) {
  return Boolean(
    axios.isCancel?.(error) ||
      error?.code === 'ERR_CANCELED' ||
      error?.name === 'CanceledError' ||
      error?.name === 'AbortError'
  );
}

/**
 * Trích xuất câu thông báo lỗi tiếng Việt thân thiện từ Axios Error theo API_CONTRACT.md
 */
export function getApiErrorMessage(error, fallbackMessage = 'Đã có lỗi xảy ra. Vui lòng thử lại.') {
  if (!error) return fallbackMessage;
  const responseData = error.response?.data;
  if (responseData?.message && typeof responseData.message === 'string') {
    return responseData.message;
  }
  if (Array.isArray(responseData?.errors) && responseData.errors.length > 0) {
    const firstErr = responseData.errors[0];
    return typeof firstErr === 'string' ? firstErr : firstErr?.message || fallbackMessage;
  }
  if (error.code === 'ERR_NETWORK') {
    return 'Không thể kết nối đến máy chủ Backend (http://localhost:5000). Vui lòng kiểm tra server.';
  }
  return error.message || fallbackMessage;
}

/**
 * Khởi tạo Axios client cơ sở dùng chung cấu hình JSON UTF-8
 */
function createBaseClient() {
  return axios.create({
    baseURL: API_BASE_URL,
    timeout: 20000,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });
}

/**
 * Khởi tạo Axios client riêng cho từng cổng (CUSTOMER / STAFF / ADMIN):
 * - Tự động đính kèm Authorization: Bearer <token> của đúng cổng đó
 * - Tự động bắt lỗi 403 ACCOUNT_LOCKED hoặc 401 UNAUTHORIZED để đăng xuất riêng cổng đó
 * @param {'CUSTOMER' | 'STAFF' | 'ADMIN'} portal
 */
function createPortalClient(portal) {
  const client = createBaseClient();

  client.interceptors.request.use(
    (config) => {
      const { token } = readPortalSession(portal);
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      const status = error.response?.status;
      const data = error.response?.data;
      const errorCode = data?.code;
      const requestUrl = String(error.config?.url || '');

      // Không kích hoạt auto-logout khi đang gọi login / register / change-password
      const isCredentialEndpoint =
        requestUrl.includes('/auth/login') ||
        requestUrl.includes('/auth/register') ||
        requestUrl.includes('/auth/change-password');

      if (!isCredentialEndpoint) {
        const isAccountLocked = status === 403 && errorCode === 'ACCOUNT_LOCKED';
        const isRoleMismatch =
          status === 403 && (errorCode === 'FORBIDDEN' || errorCode === 'WRONG_PORTAL');
        const isUnauthorized = status === 401;

        if (isAccountLocked || isRoleMismatch || isUnauthorized) {
          const hadSession = Boolean(readPortalSession(portal).token);
          clearPortalSession(portal);

          if (typeof window !== 'undefined' && (hadSession || isAccountLocked)) {
            const resolvedCode =
              errorCode ||
              (isAccountLocked
                ? 'ACCOUNT_LOCKED'
                : isRoleMismatch
                  ? 'FORBIDDEN'
                  : 'UNAUTHORIZED');

            const fallbackExpiredMsg = isAccountLocked
              ? 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Quản trị viên.'
              : isRoleMismatch
                ? 'Quyền truy cập phân hệ của tài khoản vừa thay đổi. Vui lòng đăng nhập lại.'
                : 'Phiên đăng nhập đã hết hạn hoặc mật khẩu vừa thay đổi. Vui lòng đăng nhập lại.';

            window.dispatchEvent(
              new CustomEvent(AUTH_EXPIRED_EVENT, {
                detail: {
                  portal,
                  status,
                  code: resolvedCode,
                  silent: Boolean(error.config?._silentAuthCheck && !isAccountLocked),
                  message: data?.message || fallbackExpiredMsg,
                },
              })
            );
          }
        }
      }

      return Promise.reject(error);
    }
  );

  return client;
}

/** Client cho các API công khai (/api/products, /api/categories, /api/brands, /api/auth/login...) */
export const publicApi = createBaseClient();

/** Client riêng cho Cổng Khách hàng (/) - đọc token từ lumiere_customer_auth */
export const customerApi = createPortalClient('CUSTOMER');

/** Client riêng cho Cổng Nhân viên (/staff) - đọc token từ lumiere_staff_auth */
export const staffApi = createPortalClient('STAFF');

/** Client riêng cho Cổng Quản trị (/admin) - đọc token từ lumiere_admin_auth */
export const adminApi = createPortalClient('ADMIN');
