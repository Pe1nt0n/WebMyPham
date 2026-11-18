import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  adminApi,
  AUTH_EXPIRED_EVENT,
  clearPortalSession,
  customerApi,
  publicApi,
  readPortalSession,
  staffApi,
  STORAGE_KEYS,
  writePortalSession,
} from '../api/clients';
import { useToast } from './ToastContext';

const PortalAuthContext = createContext(null);

const PORTAL_CLIENTS = {
  CUSTOMER: customerApi,
  STAFF: staffApi,
  ADMIN: adminApi,
};

const EXPECTED_ROLES = {
  CUSTOMER: 'CUSTOMER',
  STAFF: 'SALES_STAFF',
  ADMIN: 'ADMIN',
};

function createInitialPortalState(portal) {
  const stored = readPortalSession(portal);
  return {
    token: stored.token,
    user: stored.user,
    // Nếu có token lưu sẵn trong localStorage thì đặt loading = true để xác thực lại với /api/auth/me
    loading: Boolean(stored.token),
  };
}

/**
 * PortalAuthProvider quản lý 3 state xác thực hoàn toàn độc lập cho 3 cổng:
 * - CUSTOMER (Storefront /)       -> lumiere_customer_auth
 * - STAFF    (Staff Portal /staff)-> lumiere_staff_auth
 * - ADMIN    (Admin Portal /admin)-> lumiere_admin_auth
 */
export function PortalAuthProvider({ children }) {
  const toast = useToast();

  const [portals, setPortals] = useState(() => ({
    CUSTOMER: createInitialPortalState('CUSTOMER'),
    STAFF: createInitialPortalState('STAFF'),
    ADMIN: createInitialPortalState('ADMIN'),
  }));

  const setPortalState = useCallback((portal, updater) => {
    setPortals((prev) => ({
      ...prev,
      [portal]: typeof updater === 'function' ? updater(prev[portal]) : updater,
    }));
  }, []);

  /**
   * Làm mới thông tin user hiện tại của 1 cổng qua GET /api/auth/me
   */
  const refreshPortalUser = useCallback(
    async (portal, { silent = false } = {}) => {
      const stored = readPortalSession(portal);
      if (!stored.token) {
        setPortalState(portal, { token: null, user: null, loading: false });
        return null;
      }

      const client = PORTAL_CLIENTS[portal];
      const expectedRole = EXPECTED_ROLES[portal];

      try {
        const res = await client.get('/auth/me', { _silentAuthCheck: silent });
        const freshUser = res.data?.data;

        if (
          !freshUser ||
          freshUser.role_name !== expectedRole ||
          freshUser.status === 'LOCKED'
        ) {
          clearPortalSession(portal);
          setPortalState(portal, { token: null, user: null, loading: false });
          return null;
        }

        writePortalSession(portal, { token: stored.token, user: freshUser });
        setPortalState(portal, { token: stored.token, user: freshUser, loading: false });
        return freshUser;
      } catch (err) {
        const status = err.response?.status;
        if (status === 401 || status === 403) {
          clearPortalSession(portal);
          setPortalState(portal, { token: null, user: null, loading: false });
          return null;
        }

        // Nếu lỗi mạng tạm thời, giữ phiên cache hợp lệ để không đá văng người dùng oan
        setPortalState(portal, (prev) => ({
          token: stored.token,
          user: prev.user || stored.user,
          loading: false,
        }));
        return stored.user;
      }
    },
    [setPortalState]
  );

  // Khi khởi chạy ứng dụng: xác thực lại các cổng đang có token trong localStorage
  useEffect(() => {
    ['CUSTOMER', 'STAFF', 'ADMIN'].forEach((portal) => {
      const { token } = readPortalSession(portal);
      if (token) {
        refreshPortalUser(portal, { silent: true });
      }
    });
  }, [refreshPortalUser]);

  // Lắng nghe sự kiện hết hạn token (401 UNAUTHORIZED) hoặc khóa tài khoản (403 ACCOUNT_LOCKED) riêng từng cổng
  useEffect(() => {
    const handleAuthExpired = (event) => {
      const { portal, message, silent, code } = event.detail || {};
      if (!portal || !EXPECTED_ROLES[portal]) return;

      clearPortalSession(portal);
      setPortalState(portal, { token: null, user: null, loading: false });

      if (!silent && message) {
        if (code === 'ACCOUNT_LOCKED') {
          toast.error(message, { title: 'Tài khoản bị khóa' });
        } else if (code === 'FORBIDDEN' || code === 'WRONG_PORTAL') {
          toast.warning(message, { title: 'Thay đổi phân quyền' });
        } else {
          toast.warning(message, { title: 'Phiên đăng nhập hết hạn' });
        }
      }
    };

    // Đồng bộ giữa nhiều tab cùng một cổng (không ảnh hưởng 2 cổng kia nhờ khóa STORAGE_KEYS tách biệt)
    const handleStorageChange = (event) => {
      const matchedPortal = Object.entries(STORAGE_KEYS).find(
        ([key, storageName]) =>
          key !== 'CART' && storageName === event.key
      )?.[0];

      if (!matchedPortal) return;
      const updated = readPortalSession(matchedPortal);
      setPortalState(matchedPortal, {
        token: updated.token,
        user: updated.user,
        loading: false,
      });
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [setPortalState, toast]);

  /**
   * Đăng nhập cho 1 cổng cụ thể ('CUSTOMER' | 'STAFF' | 'ADMIN').
   * Hỗ trợ gọi linh hoạt: login({ username, password }) HOẶC login(username, password)
   */
  const loginPortal = useCallback(
    async (portal, credentialsOrUsername, maybePassword) => {
      const credentials =
        typeof credentialsOrUsername === 'string'
          ? {
              username: credentialsOrUsername.trim(),
              password: maybePassword || '',
            }
          : {
              username: String(credentialsOrUsername?.username || '').trim(),
              password: credentialsOrUsername?.password || '',
            };

      const res = await publicApi.post('/auth/login', {
        username: credentials.username,
        password: credentials.password,
        portal,
      });

      const { token, user } = res.data?.data || {};
      const expectedRole = EXPECTED_ROLES[portal];

      if (!token || !user || user.role_name !== expectedRole) {
        const portalErr = new Error('Tài khoản không thuộc phân hệ đăng nhập này.');
        portalErr.response = {
          status: 403,
          data: {
            success: false,
            code: 'WRONG_PORTAL',
            message: 'Tài khoản không có quyền truy cập vào phân hệ này.',
          },
        };
        throw portalErr;
      }

      writePortalSession(portal, { token, user });
      setPortalState(portal, { token, user, loading: false });

      return {
        success: true,
        message: res.data?.message || 'Đăng nhập thành công',
        token,
        user,
        data: res.data?.data,
      };
    },
    [setPortalState]
  );

  /**
   * Đăng ký tài khoản Khách hàng mới (POST /api/auth/register) & tự động đăng nhập cổng CUSTOMER
   */
  const registerCustomer = useCallback(
    async (payload) => {
      const res = await publicApi.post('/auth/register', payload);
      const { token, user } = res.data?.data || {};

      if (token && user) {
        writePortalSession('CUSTOMER', { token, user });
        setPortalState('CUSTOMER', { token, user, loading: false });
      }

      return {
        success: true,
        message: res.data?.message || 'Đăng ký tài khoản thành công',
        token,
        user,
        data: res.data?.data,
      };
    },
    [setPortalState]
  );

  /**
   * Đăng xuất riêng 1 cổng
   */
  const logoutPortal = useCallback(
    (portal) => {
      clearPortalSession(portal);
      setPortalState(portal, { token: null, user: null, loading: false });
    },
    [setPortalState]
  );

  /**
   * Cập nhật hồ sơ cá nhân (PUT /api/auth/profile) cho cổng tương ứng
   */
  const updatePortalProfile = useCallback(
    async (portal, profileData) => {
      const client = PORTAL_CLIENTS[portal];
      const res = await client.put('/auth/profile', profileData);
      const updatedUser = res.data?.data;

      setPortalState(portal, (prev) => {
        const mergedUser = updatedUser || { ...prev.user, ...profileData };
        if (prev.token) {
          writePortalSession(portal, { token: prev.token, user: mergedUser });
        }
        return {
          ...prev,
          user: mergedUser,
        };
      });

      return {
        success: true,
        message: res.data?.message || 'Cập nhật hồ sơ thành công',
        user: updatedUser,
        data: updatedUser,
      };
    },
    [setPortalState]
  );

  /**
   * Đổi mật khẩu (PUT /api/auth/change-password) cho cổng tương ứng
   * Hỗ trợ gọi: changePassword({ current_password, new_password }) hoặc changePassword(currentPassword, newPassword)
   * Nếu Backend cấp JWT mới (do cơ chế thu hồi token cũ khi password_hash thay đổi), tự động lưu ngay token mới
   * để người dùng không bị đăng xuất khỏi phiên hiện tại.
   */
  const changePortalPassword = useCallback(
    async (portal, payloadOrCurrent, maybeNewPassword) => {
      const client = PORTAL_CLIENTS[portal];
      const body =
        typeof payloadOrCurrent === 'string'
          ? {
              current_password: payloadOrCurrent,
              new_password: maybeNewPassword || '',
            }
          : {
              current_password:
                payloadOrCurrent?.current_password ?? payloadOrCurrent?.currentPassword ?? '',
              new_password:
                payloadOrCurrent?.new_password ?? payloadOrCurrent?.newPassword ?? '',
            };

      const res = await client.put('/auth/change-password', body);
      const nextToken = res.data?.data?.token || res.data?.token;

      if (nextToken) {
        const stored = readPortalSession(portal);
        const nextUser = res.data?.data?.user || stored.user;
        writePortalSession(portal, { token: nextToken, user: nextUser });
        setPortalState(portal, (prev) => ({
          ...prev,
          token: nextToken,
          user: res.data?.data?.user || prev.user || stored.user,
        }));
      }

      return res.data;
    },
    [setPortalState]
  );

  const value = useMemo(
    () => ({
      portals,
      loginPortal,
      registerCustomer,
      logoutPortal,
      refreshPortalUser,
      updatePortalProfile,
      changePortalPassword,
    }),
    [
      portals,
      loginPortal,
      registerCustomer,
      logoutPortal,
      refreshPortalUser,
      updatePortalProfile,
      changePortalPassword,
    ]
  );

  return (
    <PortalAuthContext.Provider value={value}>
      {children}
    </PortalAuthContext.Provider>
  );
}

function usePortalAuthContext() {
  const ctx = useContext(PortalAuthContext);
  if (!ctx) {
    throw new Error(
      'useCustomerAuth / useStaffAuth / useAdminAuth phải được sử dụng bên trong <PortalAuthProvider>.'
    );
  }
  return ctx;
}

/**
 * Hook xác thực dành riêng cho Cổng Khách Hàng (Storefront /)
 */
export function useCustomerAuth() {
  const {
    portals,
    loginPortal,
    registerCustomer,
    logoutPortal,
    refreshPortalUser,
    updatePortalProfile,
    changePortalPassword,
  } = usePortalAuthContext();

  const state = portals.CUSTOMER;
  const isAuthenticated = Boolean(
    state.token &&
      state.user &&
      state.user.role_name === 'CUSTOMER' &&
      state.user.status !== 'LOCKED'
  );

  const login = useCallback(
    (credentialsOrUsername, maybePassword) =>
      loginPortal('CUSTOMER', credentialsOrUsername, maybePassword),
    [loginPortal]
  );

  const logout = useCallback(() => logoutPortal('CUSTOMER'), [logoutPortal]);
  const refreshUser = useCallback(() => refreshPortalUser('CUSTOMER'), [refreshPortalUser]);
  const updateProfile = useCallback(
    (data) => updatePortalProfile('CUSTOMER', data),
    [updatePortalProfile]
  );
  const changePassword = useCallback(
    (payloadOrCurrent, maybeNew) =>
      changePortalPassword('CUSTOMER', payloadOrCurrent, maybeNew),
    [changePortalPassword]
  );

  return useMemo(
    () => ({
      user: state.user,
      token: state.token,
      isAuthenticated,
      loading: state.loading,
      login,
      register: registerCustomer,
      logout,
      refreshUser,
      updateProfile,
      changePassword,
    }),
    [
      state.user,
      state.token,
      state.loading,
      isAuthenticated,
      login,
      registerCustomer,
      logout,
      refreshUser,
      updateProfile,
      changePassword,
    ]
  );
}

/**
 * Hook xác thực dành riêng cho Cổng Nhân Viên Bán Hàng (/staff)
 */
export function useStaffAuth() {
  const {
    portals,
    loginPortal,
    logoutPortal,
    refreshPortalUser,
    updatePortalProfile,
    changePortalPassword,
  } = usePortalAuthContext();

  const state = portals.STAFF;
  const isAuthenticated = Boolean(
    state.token &&
      state.user &&
      state.user.role_name === 'SALES_STAFF' &&
      state.user.status !== 'LOCKED'
  );

  const login = useCallback(
    (credentialsOrUsername, maybePassword) =>
      loginPortal('STAFF', credentialsOrUsername, maybePassword),
    [loginPortal]
  );

  const logout = useCallback(() => logoutPortal('STAFF'), [logoutPortal]);
  const refreshUser = useCallback(() => refreshPortalUser('STAFF'), [refreshPortalUser]);
  const updateProfile = useCallback(
    (data) => updatePortalProfile('STAFF', data),
    [updatePortalProfile]
  );
  const changePassword = useCallback(
    (payloadOrCurrent, maybeNew) =>
      changePortalPassword('STAFF', payloadOrCurrent, maybeNew),
    [changePortalPassword]
  );

  return useMemo(
    () => ({
      user: state.user,
      token: state.token,
      isAuthenticated,
      loading: state.loading,
      login,
      logout,
      refreshUser,
      updateProfile,
      changePassword,
    }),
    [
      state.user,
      state.token,
      state.loading,
      isAuthenticated,
      login,
      logout,
      refreshUser,
      updateProfile,
      changePassword,
    ]
  );
}

/**
 * Hook xác thực dành riêng cho Cổng Quản Trị Hệ Thống (/admin)
 */
export function useAdminAuth() {
  const {
    portals,
    loginPortal,
    logoutPortal,
    refreshPortalUser,
    updatePortalProfile,
    changePortalPassword,
  } = usePortalAuthContext();

  const state = portals.ADMIN;
  const isAuthenticated = Boolean(
    state.token &&
      state.user &&
      state.user.role_name === 'ADMIN' &&
      state.user.status !== 'LOCKED'
  );

  const login = useCallback(
    (credentialsOrUsername, maybePassword) =>
      loginPortal('ADMIN', credentialsOrUsername, maybePassword),
    [loginPortal]
  );

  const logout = useCallback(() => logoutPortal('ADMIN'), [logoutPortal]);
  const refreshUser = useCallback(() => refreshPortalUser('ADMIN'), [refreshPortalUser]);
  const updateProfile = useCallback(
    (data) => updatePortalProfile('ADMIN', data),
    [updatePortalProfile]
  );
  const changePassword = useCallback(
    (payloadOrCurrent, maybeNew) =>
      changePortalPassword('ADMIN', payloadOrCurrent, maybeNew),
    [changePortalPassword]
  );

  return useMemo(
    () => ({
      user: state.user,
      token: state.token,
      isAuthenticated,
      loading: state.loading,
      login,
      logout,
      refreshUser,
      updateProfile,
      changePassword,
    }),
    [
      state.user,
      state.token,
      state.loading,
      isAuthenticated,
      login,
      logout,
      refreshUser,
      updateProfile,
      changePassword,
    ]
  );
}
