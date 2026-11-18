import { useCallback, useEffect, useState } from 'react';
import {
  Ban,
  CheckCircle2,
  ClipboardList,
  Clock,
  Eye,
  Filter,
  Loader2,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  XCircle,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { isCanceledRequest, staffApi } from '../../api/clients';
import { CancelOrderModal } from '../../components/staff/CancelOrderModal';
import { OrderDetailModal } from '../../components/staff/OrderDetailModal';
import { VnDateInput } from '../../components/staff/VnDateInput';
import { useToast } from '../../contexts/ToastContext';
import {
  formatCurrency,
  formatDateTime,
  getApiErrorMessage,
  isValidDDMMYYYY,
  ORDER_STATUS_CONFIG,
  parseDDMMYYYYToISO,
  PAYMENT_METHOD_CONFIG,
} from '../../utils/format';

const ORDER_TABS = [
  { value: '', label: 'Tất cả đơn hàng', icon: ClipboardList },
  { value: 'PENDING', label: 'Chờ xác nhận', icon: Clock },
  { value: 'APPROVED', label: 'Đã duyệt & Xuất kho', icon: CheckCircle2 },
  { value: 'CANCELLED', label: 'Đã hủy', icon: XCircle },
];

const COMMERCIAL_ORDER_LABELS = {
  PENDING: 'Chờ xác nhận',
  APPROVED: 'Đã duyệt & Xuất kho',
  CANCELLED: 'Đã hủy',
};

export function StaffOrdersPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [statusTab, setStatusTab] = useState(
    () => searchParams.get('status') || ''
  );
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [fromVN, setFromVN] = useState('');
  const [toVN, setToVN] = useState('');
  const [appliedDates, setAppliedDates] = useState({ fromISO: '', toISO: '' });

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [cancellingOrder, setCancellingOrder] = useState(null);

  useEffect(() => {
    const queryStatus = searchParams.get('status') || '';
    if (queryStatus !== statusTab) {
      setStatusTab(queryStatus);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 280);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchOrders = useCallback(
    async (options = {}) => {
      const signal = options?.signal;
      try {
        setLoading(true);
        const params = {};
        if (statusTab) params.status = statusTab;
        if (debouncedSearch) params.search = debouncedSearch;
        if (appliedDates.fromISO) params.from_date = appliedDates.fromISO;
        if (appliedDates.toISO) params.to_date = appliedDates.toISO;

        const res = await staffApi.get('/staff/orders', { params, signal });
        setOrders(Array.isArray(res.data?.data) ? res.data.data : []);
      } catch (err) {
        if (isCanceledRequest(err)) return;
        toast.error(
          getApiErrorMessage(err, 'Không thể tải danh sách đơn đặt hàng.')
        );
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [statusTab, debouncedSearch, appliedDates, toast]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchOrders({ signal: controller.signal });
    return () => controller.abort();
  }, [fetchOrders]);

  const handleSelectStatusTab = (val) => {
    setStatusTab(val);
    const next = new URLSearchParams(searchParams);
    if (val) next.set('status', val);
    else next.delete('status');
    setSearchParams(next, { replace: true });
  };

  const handleApplyDateFilter = (e) => {
    e.preventDefault();
    const f = fromVN.trim();
    const t = toVN.trim();

    if (f && !isValidDDMMYYYY(f)) {
      toast.warning('Ngày bắt đầu không đúng định dạng dd/mm/yyyy hợp lệ.');
      return;
    }
    if (t && !isValidDDMMYYYY(t)) {
      toast.warning('Ngày kết thúc không đúng định dạng dd/mm/yyyy hợp lệ.');
      return;
    }

    const fromISO = f ? parseDDMMYYYYToISO(f) : '';
    const toISO = t ? parseDDMMYYYYToISO(t) : '';

    if (fromISO && toISO && fromISO > toISO) {
      toast.warning('Ngày bắt đầu không được lớn hơn ngày kết thúc.');
      return;
    }

    setAppliedDates({ fromISO: fromISO || '', toISO: toISO || '' });
  };

  const handleResetFilters = () => {
    handleSelectStatusTab('');
    setSearchInput('');
    setDebouncedSearch('');
    setFromVN('');
    setToVN('');
    setAppliedDates({ fromISO: '', toISO: '' });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Khung Bộ lọc Trạng thái & Tìm kiếm */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              Tiếp nhận, Điều phối Kho &amp; Xử lý Đơn đặt hàng
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Xác nhận đơn sẽ tự động khấu trừ tồn kho và phát hành hóa đơn bán
              lẻ • Hủy đơn đã xuất kho sẽ tự động hoàn nhập số lượng về kho
            </p>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={() => fetchOrders()}
            className="inline-flex self-start sm:self-auto items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
            />
            <span>Làm mới danh sách</span>
          </button>
        </div>

        {/* Các Tab Trạng thái thương mại */}
        <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-3.5">
          {ORDER_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = statusTab === tab.value;
            return (
              <button
                key={tab.value || 'all'}
                type="button"
                onClick={() => handleSelectStatusTab(tab.value)}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all ${
                  active
                    ? tab.value === 'PENDING'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : tab.value === 'CANCELLED'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-emerald-700 text-white shadow-sm'
                    : 'border border-slate-200/90 bg-slate-50/70 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tìm kiếm & Lọc ngày đặt */}
        <form
          onSubmit={handleApplyDateFilter}
          className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
        >
          <div className="md:col-span-5">
            <label
              htmlFor="staff-order-search"
              className="mb-1 block text-xs font-semibold text-slate-600"
            >
              Tìm kiếm đơn đặt hàng
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="staff-order-search"
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Mã đơn (#8), tên người nhận, số điện thoại hoặc số hóa đơn..."
                className="w-full rounded-xl border border-slate-200/90 bg-slate-50/50 pl-10 pr-3.5 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/15 transition-all"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <VnDateInput
              id="order-from-date"
              label="Từ ngày đặt"
              value={fromVN}
              onChange={setFromVN}
            />
          </div>

          <div className="md:col-span-2">
            <VnDateInput
              id="order-to-date"
              label="Đến ngày đặt"
              value={toVN}
              onChange={setToVN}
            />
          </div>

          <div className="md:col-span-3 flex items-center gap-2">
            <button
              type="submit"
              className="h-[38px] flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 transition-colors"
            >
              <Filter className="h-3.5 w-3.5" />
              <span>Áp dụng ngày</span>
            </button>

            {(statusTab ||
              searchInput ||
              fromVN ||
              toVN ||
              appliedDates.fromISO ||
              appliedDates.toISO) && (
              <button
                type="button"
                onClick={handleResetFilters}
                title="Đặt lại toàn bộ bộ lọc"
                className="h-[38px] inline-flex items-center justify-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-100"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Đặt lại</span>
              </button>
            )}
          </div>
        </form>
      </section>

      {/* Bảng Danh sách Đơn đặt hàng */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
            <Loader2 className="h-7 w-7 animate-spin text-emerald-700" />
            <span className="text-sm font-medium">
              Đang tải danh sách đơn đặt hàng...
            </span>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <ClipboardList className="h-11 w-11 text-slate-300 mb-3" />
            <p className="text-sm sm:text-base font-bold text-slate-800">
              Không tìm thấy đơn đặt hàng phù hợp
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Vui lòng chọn tab &ldquo;Tất cả đơn hàng&rdquo; hoặc điều chỉnh
              điều kiện lọc.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200/80 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3.5">Mã đơn</th>
                  <th className="px-4 py-3.5">Người nhận &amp; Giao hàng</th>
                  <th className="px-4 py-3.5">Thời gian đặt</th>
                  <th className="px-4 py-3.5 text-right">Giá trị &amp; TT</th>
                  <th className="px-4 py-3.5 text-center">Trạng thái</th>
                  <th className="px-4 py-3.5">Nhân sự / Chứng từ</th>
                  <th className="px-5 py-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((order) => {
                  const statusMeta =
                    ORDER_STATUS_CONFIG[order.status] ||
                    ORDER_STATUS_CONFIG.PENDING;
                  const statusLabel =
                    COMMERCIAL_ORDER_LABELS[order.status] || statusMeta.label;
                  const payMeta =
                    PAYMENT_METHOD_CONFIG[order.payment_method] ||
                    PAYMENT_METHOD_CONFIG.COD;

                  return (
                    <tr
                      key={order.id}
                      className={`transition-colors ${
                        order.status === 'PENDING'
                          ? 'bg-amber-50/20 hover:bg-amber-50/45'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="px-4 py-3.5 whitespace-nowrap tabular-nums">
                        <button
                          type="button"
                          onClick={() => setSelectedOrderId(order.id)}
                          className="font-mono text-sm font-bold text-emerald-700 hover:underline"
                        >
                          #{order.id}
                        </button>
                        <p className="text-[11px] text-slate-400">
                          {order.item_count} mặt hàng
                        </p>
                      </td>

                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-900">
                          {order.recipient_name}
                        </p>
                        <p className="font-mono text-xs text-slate-600 tabular-nums">
                          {order.recipient_phone}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate max-w-[240px]">
                          {order.shipping_address}
                        </p>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap text-xs font-medium text-slate-600 tabular-nums">
                        {formatDateTime(order.order_date)}
                      </td>

                      <td className="px-4 py-3.5 text-right whitespace-nowrap tabular-nums">
                        <p className="font-bold text-slate-900">
                          {formatCurrency(order.total_amount)}
                        </p>
                        <span
                          className={`mt-1 inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold ${payMeta.badgeClass}`}
                        >
                          {payMeta.shortLabel}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusMeta.badgeClass}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${statusMeta.dotClass}`}
                          />
                          {statusLabel}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap text-xs">
                        {order.staff_name ? (
                          <p className="font-semibold text-slate-800">
                            {order.staff_name}
                          </p>
                        ) : (
                          <p className="text-amber-700 font-medium">
                            Chờ tiếp nhận xử lý
                          </p>
                        )}

                        {order.invoice_code && order.invoice_id && (
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/staff/invoices/${order.invoice_id}/print`
                              )
                            }
                            className="mt-0.5 inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-emerald-700 hover:underline"
                          >
                            <span>{order.invoice_code}</span>
                          </button>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {order.status === 'PENDING' ? (
                            <button
                              type="button"
                              onClick={() => setSelectedOrderId(order.id)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-800 transition-colors"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>Đối soát &amp; Duyệt</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSelectedOrderId(order.id)}
                              className="inline-flex items-center gap-1 rounded-xl border border-slate-200/90 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>Chi tiết</span>
                            </button>
                          )}

                          {order.status === 'APPROVED' && order.invoice_id && (
                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/staff/invoices/${order.invoice_id}/print`
                                )
                              }
                              className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors"
                              title="Xem và in hóa đơn bán lẻ"
                            >
                              <Printer className="h-3.5 w-3.5" />
                              <span>In HĐ</span>
                            </button>
                          )}

                          {(order.status === 'PENDING' ||
                            order.status === 'APPROVED') && (
                            <button
                              type="button"
                              onClick={() => setCancellingOrder(order)}
                              className="inline-flex items-center gap-1 rounded-xl border border-rose-200/80 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                              title={
                                order.status === 'APPROVED'
                                  ? 'Hủy đơn và hoàn nhập tồn kho'
                                  : 'Hủy đơn chờ xác nhận'
                              }
                            >
                              <Ban className="h-3.5 w-3.5" />
                              <span>Hủy</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal Chi tiết Đơn hàng & Đối soát kho */}
      <OrderDetailModal
        isOpen={Boolean(selectedOrderId)}
        orderId={selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
        onOrderUpdated={() => fetchOrders()}
      />

      {/* Modal Xác nhận Hủy đơn */}
      <CancelOrderModal
        isOpen={Boolean(cancellingOrder)}
        onClose={() => setCancellingOrder(null)}
        order={cancellingOrder}
        onCancelled={() => fetchOrders()}
      />
    </div>
  );
}

export default StaffOrdersPage;
