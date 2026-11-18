import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Pencil,
  ShieldAlert,
  UserPlus,
  X,
} from 'lucide-react';
import { ROLE_CONFIG, USER_STATUS_CONFIG } from '../../utils/format';
import { useModalDialog } from '../../utils/useModalDialog';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DEFAULT_ROLES = [
  {
    id: 1,
    role_name: 'ADMIN',
    description:
      'Quản trị viên hệ thống: Quản lý định danh, phân quyền truy cập và giám sát dịch vụ',
  },
  {
    id: 2,
    role_name: 'SALES_STAFF',
    description:
      'Nhân sự vận hành: Quản lý danh mục sản phẩm, kho hàng, xử lý đơn đặt hàng và hóa đơn',
  },
  {
    id: 3,
    role_name: 'CUSTOMER',
    description:
      'Khách hàng thành viên: Mua sắm trực tuyến và theo dõi lịch sử đơn đặt hàng cá nhân',
  },
];

const WORKSPACE_BADGES = {
  ADMIN: 'Admin Console',
  SALES_STAFF: 'Vận hành bán lẻ',
  CUSTOMER: 'Cửa hàng',
};

export function UserFormModal({
  isOpen,
  mode = 'create',
  initialUser = null,
  roles = [],
  currentAdminId = null,
  submitting = false,
  onClose,
  onSubmit,
}) {
  const isEdit = mode === 'edit' && Boolean(initialUser);
  const isEditingSelf =
    isEdit && Number(initialUser?.id) === Number(currentAdminId);
  const availableRoles = roles.length > 0 ? roles : DEFAULT_ROLES;

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    full_name: '',
    email: '',
    phone: '',
    address: '',
    role_name: 'SALES_STAFF',
    status: 'ACTIVE',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    if (isEdit && initialUser) {
      setFormData({
        username: initialUser.username || '',
        password: '',
        full_name: initialUser.full_name || '',
        email: initialUser.email || '',
        phone: initialUser.phone || '',
        address: initialUser.address || '',
        role_name: initialUser.role_name || 'CUSTOMER',
        status: initialUser.status || 'ACTIVE',
      });
    } else {
      setFormData({
        username: '',
        password: '',
        full_name: '',
        email: '',
        phone: '',
        address: '',
        role_name: 'SALES_STAFF',
        status: 'ACTIVE',
      });
    }
    setShowPassword(false);
    setFormError('');
  }, [isOpen, isEdit, initialUser]);

  useModalDialog({
    isOpen,
    onClose,
    disabled: submitting,
  });

  if (!isOpen) return null;

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formError) setFormError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');

    const trimmedUsername = formData.username.trim();
    const trimmedFullName = formData.full_name.trim();
    const trimmedEmail = formData.email.trim().toLowerCase();
    const trimmedPhone = formData.phone.trim();
    const trimmedAddress = formData.address.trim();
    const rawPassword = formData.password;

    if (!isEdit) {
      if (!/^[a-zA-Z0-9._-]{3,50}$/.test(trimmedUsername)) {
        setFormError(
          'Tên đăng nhập phải từ 3–50 ký tự, chỉ gồm chữ không dấu, số, dấu chấm (.), gạch dưới (_), gạch ngang (-) và không chứa khoảng trắng.'
        );
        return;
      }
      if (!rawPassword || rawPassword.length < 6) {
        setFormError('Mật khẩu khởi tạo phải có tối thiểu 6 ký tự.');
        return;
      }
    } else if (
      !isEditingSelf &&
      rawPassword.trim() !== '' &&
      rawPassword.length < 6
    ) {
      setFormError(
        'Mật khẩu đặt lại phải có tối thiểu 6 ký tự (hoặc để trống nếu giữ nguyên).'
      );
      return;
    }

    if (!trimmedFullName) {
      setFormError('Vui lòng nhập đầy đủ họ và tên người dùng.');
      return;
    }

    if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
      setFormError('Vui lòng nhập địa chỉ Email hợp lệ.');
      return;
    }

    const matchedRole =
      availableRoles.find((r) => r.role_name === formData.role_name) ||
      DEFAULT_ROLES.find((r) => r.role_name === formData.role_name);

    const payload = {
      full_name: trimmedFullName,
      email: trimmedEmail,
      phone: trimmedPhone || null,
      address: trimmedAddress || null,
      role_id:
        matchedRole?.id || ROLE_CONFIG[formData.role_name]?.role_id || 3,
      role_name: formData.role_name,
      status: isEditingSelf ? 'ACTIVE' : formData.status,
    };

    if (!isEdit) {
      payload.username = trimmedUsername;
      payload.password = rawPassword;
    } else if (!isEditingSelf && rawPassword.trim() !== '') {
      payload.password = rawPassword;
    }

    try {
      await onSubmit?.(payload, setFormError);
    } catch {
      // Đã xử lý tại hàm cha
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9980] flex items-center justify-center p-4 no-print print:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-form-modal-title"
    >
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-[2px]"
        onClick={() => {
          if (!submitting) onClose?.();
        }}
      />

      <div className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl animate-modal-in">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-slate-200/80 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              {isEdit ? (
                <Pencil className="h-4 w-4" />
              ) : (
                <UserPlus className="h-5 w-5" />
              )}
            </div>
            <div>
              <h2
                id="user-form-modal-title"
                className="text-base font-bold text-slate-900"
              >
                {isEdit
                  ? `Cập nhật hồ sơ @${initialUser.username}`
                  : 'Cấp phát tài khoản định danh mới'}
              </h2>
              <p className="text-xs text-slate-500">
                {isEdit
                  ? 'Điều chỉnh thông tin liên hệ, trạng thái hoạt động hoặc đặt lại mật khẩu truy cập'
                  : 'Thiết lập thông tin định danh và phân bổ quyền truy cập theo vai trò'}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            aria-label="Đóng hộp thoại"
            className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-200/60 hover:text-slate-600 disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body Form */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-6 space-y-5"
        >
          {formError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-700"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <span className="font-medium">{formError}</span>
            </div>
          )}

          {isEditingSelf && (
            <div className="flex items-start gap-2.5 rounded-xl border border-indigo-200 bg-indigo-50/70 p-3.5 text-xs leading-relaxed text-indigo-950">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
              <div>
                <p className="font-semibold">
                  Đang chỉnh sửa hồ sơ quản trị viên của phiên hiện tại
                </p>
                <p className="mt-0.5 text-indigo-800">
                  Bạn có thể cập nhật Họ tên, Email, Số điện thoại và Địa chỉ.
                  Vai trò và trạng thái hoạt động được bảo vệ cố định; để thay
                  đổi mật khẩu cá nhân, vui lòng thực hiện tại mục{' '}
                  <strong>Giám sát Dịch vụ &amp; Hồ sơ</strong>.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Username */}
            <div>
              <label
                htmlFor="admin-user-username"
                className="block text-xs font-semibold text-slate-700"
              >
                Tên đăng nhập <span className="text-rose-500">*</span>
              </label>
              <input
                id="admin-user-username"
                type="text"
                value={formData.username}
                onChange={handleChange('username')}
                disabled={isEdit || submitting}
                placeholder="VD: minh.nguyen"
                autoComplete="off"
                className={`mt-1.5 w-full rounded-xl border px-3.5 py-2.5 font-mono text-sm transition-colors focus:outline-none focus:ring-2 ${
                  isEdit
                    ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500'
                    : 'border-slate-200/90 bg-white text-slate-900 focus:border-indigo-500 focus:ring-indigo-500/15'
                }`}
              />
              <p className="mt-1 text-[11px] text-slate-500">
                {isEdit
                  ? 'Tên đăng nhập định danh là duy nhất và không thể thay đổi.'
                  : '3–50 ký tự không dấu, viết liền, không chứa khoảng trắng.'}
              </p>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="admin-user-password"
                className="block text-xs font-semibold text-slate-700"
              >
                {isEdit ? 'Đặt lại mật khẩu mới' : 'Mật khẩu khởi tạo'}{' '}
                {!isEdit && <span className="text-rose-500">*</span>}
              </label>

              <div className="relative mt-1.5">
                <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="admin-user-password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange('password')}
                  disabled={submitting || isEditingSelf}
                  placeholder={
                    isEditingSelf
                      ? 'Đổi mật khẩu tại mục Giám sát Dịch vụ & Hồ sơ'
                      : isEdit
                        ? 'Để trống nếu giữ nguyên mật khẩu hiện tại'
                        : 'Tối thiểu 6 ký tự'
                  }
                  autoComplete="new-password"
                  className={`w-full rounded-xl border py-2.5 pl-10 pr-10 text-sm transition-colors focus:outline-none focus:ring-2 ${
                    isEditingSelf
                      ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500'
                      : 'border-slate-200/90 bg-white text-slate-900 focus:border-indigo-500 focus:ring-indigo-500/15'
                  }`}
                />
                {!isEditingSelf && (
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                {isEditingSelf
                  ? 'Yêu cầu xác minh mật khẩu hiện tại khi đổi mật khẩu cá nhân.'
                  : isEdit
                    ? 'Chỉ nhập khi cần cấp lại mật khẩu mới cho người dùng.'
                    : 'Mật khẩu được mã hóa tự động ngay khi khởi tạo.'}
              </p>
            </div>

            {/* Họ và tên */}
            <div>
              <label
                htmlFor="admin-user-fullname"
                className="block text-xs font-semibold text-slate-700"
              >
                Họ và tên đầy đủ <span className="text-rose-500">*</span>
              </label>
              <input
                id="admin-user-fullname"
                type="text"
                value={formData.full_name}
                onChange={handleChange('full_name')}
                disabled={submitting}
                placeholder="VD: Đặng Quốc Khánh"
                className="mt-1.5 w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
              />
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="admin-user-email"
                className="block text-xs font-semibold text-slate-700"
              >
                Địa chỉ Email <span className="text-rose-500">*</span>
              </label>
              <input
                id="admin-user-email"
                type="email"
                value={formData.email}
                onChange={handleChange('email')}
                disabled={submitting}
                placeholder="VD: khanh.dang@lumiere-cosmetics.vn"
                className="mt-1.5 w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
              />
            </div>

            {/* Số điện thoại */}
            <div>
              <label
                htmlFor="admin-user-phone"
                className="block text-xs font-semibold text-slate-700"
              >
                Số điện thoại liên hệ
              </label>
              <input
                id="admin-user-phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange('phone')}
                disabled={submitting}
                placeholder="VD: 0909887766"
                className="mt-1.5 w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
              />
            </div>

            {/* Trạng thái tài khoản */}
            <div>
              <label
                htmlFor="admin-user-status"
                className="block text-xs font-semibold text-slate-700"
              >
                Trạng thái hoạt động
              </label>
              <select
                id="admin-user-status"
                value={formData.status}
                onChange={handleChange('status')}
                disabled={submitting || isEditingSelf}
                className={`mt-1.5 w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 ${
                  isEditingSelf
                    ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500'
                    : 'border-slate-200/90 bg-white text-slate-900 focus:border-indigo-500 focus:ring-indigo-500/15'
                }`}
              >
                <option value="ACTIVE">{USER_STATUS_CONFIG.ACTIVE.label}</option>
                <option value="LOCKED">
                  Tạm khóa ({USER_STATUS_CONFIG.LOCKED.label})
                </option>
              </select>
            </div>
          </div>

          {/* Địa chỉ */}
          <div>
            <label
              htmlFor="admin-user-address"
              className="block text-xs font-semibold text-slate-700"
            >
              Địa chỉ liên hệ
            </label>
            <input
              id="admin-user-address"
              type="text"
              value={formData.address}
              onChange={handleChange('address')}
              disabled={submitting}
              placeholder="VD: 273 An Dương Vương, Phường 3, Quận 5, TP. Hồ Chí Minh"
              className="mt-1.5 w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
            />
          </div>

          {/* Lựa chọn Vai trò truy cập */}
          <div role="radiogroup" aria-label="Vai trò phân quyền hệ thống">
            <span className="block text-xs font-semibold text-slate-700">
              Vai trò &amp; Phạm vi quyền hạn{' '}
              <span className="text-rose-500">*</span>
            </span>
            <div className="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {availableRoles.map((roleItem) => {
                const rConfig =
                  ROLE_CONFIG[roleItem.role_name] || ROLE_CONFIG.CUSTOMER;
                const selected = formData.role_name === roleItem.role_name;
                const badgeText =
                  WORKSPACE_BADGES[roleItem.role_name] || 'Cửa hàng';

                return (
                  <label
                    key={roleItem.role_name}
                    className={`relative flex cursor-pointer flex-col rounded-xl border p-3.5 transition-all ${
                      isEditingSelf ? 'cursor-not-allowed opacity-70' : ''
                    } ${
                      selected
                        ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600'
                        : 'border-slate-200/90 bg-white hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role_name"
                      value={roleItem.role_name}
                      checked={selected}
                      disabled={submitting || isEditingSelf}
                      onChange={handleChange('role_name')}
                      className="sr-only"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {rConfig.label}
                      </span>
                    </div>
                    <span className="mt-1 inline-flex w-fit rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                      {badgeText}
                    </span>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500 line-clamp-2">
                      {roleItem.description}
                    </p>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Chân Modal */}
          <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{isEdit ? 'Lưu thay đổi' : 'Khởi tạo tài khoản'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UserFormModal;
