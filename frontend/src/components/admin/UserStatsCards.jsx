import {
  BadgeCheck,
  Lock,
  ShieldCheck,
  SlidersHorizontal,
  UserCheck,
  Users,
} from 'lucide-react';

export function UserStatsCards({
  users = [],
  roles = [],
  roleFilter = '',
  statusFilter = '',
  onQuickFilter,
}) {
  const roleCountMap = roles.reduce((acc, item) => {
    acc[item.role_name] = Number(item.user_count);
    return acc;
  }, {});

  const totalCount = users.length;
  const adminCount =
    users.length > 0
      ? users.filter((u) => u.role_name === 'ADMIN').length
      : (roleCountMap.ADMIN ?? 0);
  const staffCount =
    users.length > 0
      ? users.filter((u) => u.role_name === 'SALES_STAFF').length
      : (roleCountMap.SALES_STAFF ?? 0);
  const customerCount =
    users.length > 0
      ? users.filter((u) => u.role_name === 'CUSTOMER').length
      : (roleCountMap.CUSTOMER ?? 0);

  const activeCount = users.filter((u) => u.status === 'ACTIVE').length;
  const lockedCount = users.filter((u) => u.status === 'LOCKED').length;

  const cards = [
    {
      key: 'ALL',
      label: 'Tổng định danh',
      value: totalCount,
      subtext: 'Toàn bộ tài khoản tổ chức',
      icon: Users,
      iconClass: 'bg-slate-900 text-white',
      activeRing: 'ring-2 ring-slate-900 border-slate-900',
      isActive: !roleFilter && !statusFilter,
      onClick: () => onQuickFilter?.({ role: '', status: '' }),
    },
    {
      key: 'ADMIN',
      label: 'Quản trị viên',
      value: adminCount,
      subtext: 'Quyền điều hành hệ thống',
      icon: ShieldCheck,
      iconClass: 'bg-indigo-600 text-white',
      activeRing: 'ring-2 ring-indigo-600 border-indigo-500',
      isActive: roleFilter === 'ADMIN' && !statusFilter,
      onClick: () =>
        onQuickFilter?.({
          role: roleFilter === 'ADMIN' ? '' : 'ADMIN',
          status: '',
        }),
    },
    {
      key: 'SALES_STAFF',
      label: 'Nhân sự vận hành',
      value: staffCount,
      subtext: 'Khối bán lẻ & kho hàng',
      icon: SlidersHorizontal,
      iconClass: 'bg-sky-600 text-white',
      activeRing: 'ring-2 ring-sky-600 border-sky-500',
      isActive: roleFilter === 'SALES_STAFF' && !statusFilter,
      onClick: () =>
        onQuickFilter?.({
          role: roleFilter === 'SALES_STAFF' ? '' : 'SALES_STAFF',
          status: '',
        }),
    },
    {
      key: 'CUSTOMER',
      label: 'Khách hàng',
      value: customerCount,
      subtext: 'Thành viên mua sắm',
      icon: UserCheck,
      iconClass: 'bg-purple-600 text-white',
      activeRing: 'ring-2 ring-purple-600 border-purple-500',
      isActive: roleFilter === 'CUSTOMER' && !statusFilter,
      onClick: () =>
        onQuickFilter?.({
          role: roleFilter === 'CUSTOMER' ? '' : 'CUSTOMER',
          status: '',
        }),
    },
    {
      key: 'ACTIVE',
      label: 'Đang hoạt động',
      value: activeCount,
      subtext: 'Được phép truy cập',
      icon: BadgeCheck,
      iconClass: 'bg-emerald-600 text-white',
      activeRing: 'ring-2 ring-emerald-600 border-emerald-500',
      isActive: statusFilter === 'ACTIVE' && !roleFilter,
      onClick: () =>
        onQuickFilter?.({
          role: '',
          status: statusFilter === 'ACTIVE' ? '' : 'ACTIVE',
        }),
    },
    {
      key: 'LOCKED',
      label: 'Đang tạm khóa',
      value: lockedCount,
      subtext: 'Đình chỉ quyền truy cập',
      icon: Lock,
      iconClass: 'bg-rose-600 text-white',
      activeRing: 'ring-2 ring-rose-600 border-rose-500',
      isActive: statusFilter === 'LOCKED' && !roleFilter,
      onClick: () =>
        onQuickFilter?.({
          role: '',
          status: statusFilter === 'LOCKED' ? '' : 'LOCKED',
        }),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => {
        const IconComponent = card.icon;
        return (
          <button
            key={card.key}
            type="button"
            onClick={card.onClick}
            className={`group flex flex-col justify-between rounded-2xl border bg-white p-4 text-left shadow-sm transition-all hover:shadow ${
              card.isActive
                ? card.activeRing
                : 'border-slate-200/80 hover:border-slate-300'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-semibold leading-snug text-slate-600">
                {card.label}
              </span>
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl shadow-sm ${card.iconClass}`}
              >
                <IconComponent className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-3">
              <p className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                {card.value}
              </p>
              <p className="mt-0.5 truncate text-[11px] font-medium text-slate-400">
                {card.subtext}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default UserStatsCards;
