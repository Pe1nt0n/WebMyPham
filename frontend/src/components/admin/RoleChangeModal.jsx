import { useEffect, useState } from 'react';
import { CheckCircle2, KeyRound, Loader2, ShieldCheck, X } from 'lucide-react';
import { ROLE_CONFIG } from '../../utils/format';
import { useModalDialog } from '../../utils/useModalDialog';

const FALLBACK_ROLES = [
  {
    id: 1,
    role_name: 'ADMIN',
    description:
      'Quản trị viên hệ thống: Quản lý định danh người dùng, chính sách phân quyền và giám sát dịch vụ',
  },
  {
    id: 2,
    role_name: 'SALES_STAFF',
    description:
      'Nhân sự vận hành bán lẻ: Quản lý danh mục sản phẩm, tồn kho, xử lý đơn đặt hàng và phát hành hóa đơn',
  },
  {
    id: 3,
    role_name: 'CUSTOMER',
    description:
      'Khách hàng thành viên: Mua sắm mỹ phẩm trực tuyến và tra cứu lịch sử đơn đặt hàng',
  },
];

const WORKSPACE_SCOPES = {
  ADMIN: 'Trung tâm Quản trị',
  SALES_STAFF: 'Cổng Vận hành Bán lẻ',
  CUSTOMER: 'Cửa hàng Trực tuyến',
};

export function RoleChangeModal({
  isOpen,
  targetUser = null,
  roles = [],
  submitting = false,
  onClose,
  onConfirm,
}) {
  const availableRoles = roles.length > 0 ? roles : FALLBACK_ROLES;
  const [selectedRoleName, setSelectedRoleName] = useState('CUSTOMER');

  useEffect(() => {
    if (isOpen && targetUser) {
      setSelectedRoleName(targetUser.role_name || 'CUSTOMER');
    }
  }, [isOpen, targetUser]);

  useModalDialog({
    isOpen,
    onClose,
    disabled: submitting,
  });

  if (!isOpen || !targetUser) return null;

  const currentRoleCfg =
    ROLE_CONFIG[targetUser.role_name] || ROLE_CONFIG.CUSTOMER;
  const selectedRoleCfg =
    ROLE_CONFIG[selectedRoleName] || ROLE_CONFIG.CUSTOMER;
  const isUnchanged = selectedRoleName === targetUser.role_name;

  const handleConfirm = () => {
    const chosen =
      availableRoles.find((r) => r.role_name === selectedRoleName) ||
      FALLBACK_ROLES.find((r) => r.role_name === selectedRoleName);

    onConfirm?.({
      role_id: chosen?.id || ROLE_CONFIG[selectedRoleName]?.role_id || 3,
      role_name: selectedRoleName,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[9985] flex items-center justify-center p-4 no-print print:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rbac-modal-title"
    >
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-[2px]"
        onClick={() => {
          if (!submitting) onClose?.();
        }}
      />

      <div className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl animate-modal-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h3
                id="rbac-modal-title"
                className="text-base font-bold text-slate-900"
              >
                Điều chỉnh Vai trò Truy cập
              </h3>
              <p className="text-xs text-slate-500">
                Cấp phát hoặc thay đổi phạm vi không gian làm việc của tài khoản
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            aria-label="Đóng hộp thoại phân quyền"
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nội dung */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">
                {targetUser.full_name}
              </p>
              <p className="truncate font-mono text-xs text-slate-500">
                @{targetUser.username} • {targetUser.email}
              </p>
            </div>
            <span
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${currentRoleCfg.badgeClass}`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${currentRoleCfg.dotClass}`}
              />
              {currentRoleCfg.label}
            </span>
          </div>

          <div
            role="radiogroup"
            aria-label="Chọn vai trò truy cập mới"
            className="space-y-2.5"
          >
            <p className="text-xs font-semibold text-slate-700">
              Chọn vai trò truy cập áp dụng:
            </p>
            {availableRoles.map((roleItem) => {
              const cfg =
                ROLE_CONFIG[roleItem.role_name] || ROLE_CONFIG.CUSTOMER;
              const scopeName =
                WORKSPACE_SCOPES[roleItem.role_name] ||
                WORKSPACE_SCOPES.CUSTOMER;
              const selected = selectedRoleName === roleItem.role_name;
              const isCurrent = targetUser.role_name === roleItem.role_name;

              return (
                <label
                  key={roleItem.role_name}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-all ${
                    selected
                      ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600'
                      : 'border-slate-200/90 bg-white hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="rbac_role_choice"
                    value={roleItem.role_name}
                    checked={selected}
                    disabled={submitting}
                    onChange={() => setSelectedRoleName(roleItem.role_name)}
                    className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          {cfg.label}
                        </span>
                        {isCurrent && (
                          <span className="rounded-md bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                            Hiện tại
                          </span>
                        )}
                      </div>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                        {scopeName}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      {roleItem.description}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>

          <div className="flex items-start gap-2.5 rounded-xl border border-amber-200/90 bg-amber-50/80 p-3 text-xs leading-relaxed text-amber-900">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <span>
              Chính sách phân quyền mới có hiệu lực ngay lập tức sau khi xác
              nhận. Tài khoản sẽ chỉ được phép truy cập vào không gian làm việc
              tương ứng với vai trò mới.
            </span>
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="rounded-xl border border-slate-200/90 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              disabled={submitting || isUnchanged}
              onClick={handleConfirm}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              <span>Cấp quyền {selectedRoleCfg.label}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RoleChangeModal;
