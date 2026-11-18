import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CalendarSearch,
  CheckCircle2,
  Eye,
  FileText,
  Filter,
  Loader2,
  Printer,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { isCanceledRequest, staffApi } from '../../api/clients';
import { VnDateInput } from '../../components/staff/VnDateInput';
import { useToast } from '../../contexts/ToastContext';
import {
  formatCurrency,
  formatDateTime,
  getApiErrorMessage,
  isoToDDMMYYYY,
  isValidDDMMYYYY,
  parseDDMMYYYYToISO,
  PAYMENT_METHOD_CONFIG,
} from '../../utils/format';

const INVOICE_DATE_SHORTCUTS = [
  { label: 'Tất cả chứng từ', fromVN: '', toVN: '' },
  { label: 'Tháng 09/2026', fromVN: '01/09/2026', toVN: '30/09/2026' },
  { label: 'Tháng 10/2026', fromVN: '01/10/2026', toVN: '31/10/2026' },
  { label: 'Tháng 11/2026', fromVN: '01/11/2026', toVN: '30/11/2026' },
  { label: 'Năm 2026', fromVN: '01/01/2026', toVN: '31/12/2026' },
];

export function StaffInvoicesPage() {
  const toast = useToast();
  const navigate = useNavigate();

  const [fromVN, setFromVN] = useState('');
  const [toVN, setToVN] = useState('');
  const [appliedDates, setAppliedDates] = useState({ fromISO: '', toISO: '' });

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 280);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchInvoices = useCallback(
    async (options = {}) => {
      const signal = options?.signal;
      try {
        setLoading(true);
        const params = {};
        if (appliedDates.fromISO) params.from_date = appliedDates.fromISO;
        if (appliedDates.toISO) params.to_date = appliedDates.toISO;
        if (debouncedSearch) params.search = debouncedSearch;

        const res = await staffApi.get('/staff/invoices', { params, signal });
        setInvoices(Array.isArray(res.data?.data) ? res.data.data : []);
      } catch (err) {
        if (isCanceledRequest(err)) return;
        toast.error(
          getApiErrorMessage(err, 'Không thể tải danh sách hóa đơn bán lẻ.')
        );
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [appliedDates, debouncedSearch, toast]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchInvoices({ signal: controller.signal });
    return () => controller.abort();
  }, [fetchInvoices]);

  const handleApplyDateRange = (e) => {
    e.preventDefault();
    const f = fromVN.trim();
    const t = toVN.trim();

    if (f && !isValidDDMMYYYY(f)) {
      toast.warning(
        'Ngày bắt đầu không đúng định dạng dd/mm/yyyy hợp lệ (VD: 01/09/2026).'
      );
      return;
    }
    if (t && !isValidDDMMYYYY(t)) {
      toast.warning(
        'Ngày kết thúc không đúng định dạng dd/mm/yyyy hợp lệ (VD: 30/11/2026).'
      );
      return;
    }

    const fromISO = f ? parseDDMMYYYYToISO(f) : '';
    const toISO = t ? parseDDMMYYYYToISO(t) : '';

    if (fromISO && toISO && fromISO > toISO) {
      toast.warning('Khoảng ngày không hợp lệ: Ngày bắt đầu lớn hơn Ngày kết thúc.');
      return;
    }

    if (fromISO) setFromVN(isoToDDMMYYYY(fromISO));
    if (toISO) setToVN(isoToDDMMYYYY(toISO));

    setAppliedDates({ fromISO: fromISO || '', toISO: toISO || '' });
  };

  const handleShortcutClick = (shortcut) => {
    setFromVN(shortcut.fromVN);
    setToVN(shortcut.toVN);
    setAppliedDates({
      fromISO: shortcut.fromVN ? parseDDMMYYYYToISO(shortcut.fromVN) || '' : '',
      toISO: shortcut.toVN ? parseDDMMYYYYToISO(shortcut.toVN) || '' : '',
    });
  };

  const handleTodayShortcut = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const todayISO = `${yyyy}-${mm}-${dd}`;
    const todayVN = isoToDDMMYYYY(todayISO);

    setFromVN(todayVN);
    setToVN(todayVN);
    setAppliedDates({ fromISO: todayISO, toISO: todayISO });
  };

  const handleResetFilters = () => {
    setFromVN('');
    setToVN('');
    setSearchInput('');
    setDebouncedSearch('');
    setAppliedDates({ fromISO: '', toISO: '' });
  };

  const validInvoices = invoices.filter(
    (inv) => inv.order_status === 'APPROVED'
  );
  const cancelledInvoicesCount = invoices.filter(
    (inv) => inv.order_status === 'CANCELLED'
  ).length;
  const totalValidAmount = validInvoices.reduce(
    (sum, inv) => sum + (Number(inv.total_amount) || 0),
    0
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Bộ lọc Hóa đơn bán lẻ */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/15">
              <ReceiptText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Sổ Chứng từ &amp; Hóa đơn Bán lẻ
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Tra cứu lịch sử phát hành chứng từ, đối soát doanh thu và xuất
                phiếu in chuẩn khổ A4 / lưu tệp PDF
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={() => fetchInvoices()}
            className="inline-flex self-start sm:self-auto items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
            />
            <span>Làm mới sổ chứng từ</span>
          </button>
        </div>

        {/* Các mốc kỳ chứng từ chọn nhanh */}
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3.5">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 mr-1">
            <CalendarSearch className="h-3.5 w-3.5 text-emerald-700" />
            <span>Kỳ chứng từ:</span>
          </span>

          {INVOICE_DATE_SHORTCUTS.map((sc) => {
            const scFromISO = sc.fromVN
              ? parseDDMMYYYYToISO(sc.fromVN) || ''
              : '';
            const scToISO = sc.toVN ? parseDDMMYYYYToISO(sc.toVN) || '' : '';
            const isCurrent =
              appliedDates.fromISO === scFromISO &&
              appliedDates.toISO === scToISO;
            return (
              <button
                key={sc.label}
                type="button"
                onClick={() => handleShortcutClick(sc)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                  isCurrent
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'border border-slate-200/90 bg-slate-50/70 text-slate-700 hover:border-slate-300 hover:bg-slate-100/70'
                }`}
              >
                {sc.label}
              </button>
            );
          })}

          <button
            type="button"
            onClick={handleTodayShortcut}
            className="rounded-xl border border-slate-200/90 bg-slate-50/70 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-100/70 transition-all"
          >
            Hôm nay
          </button>
        </div>

        {/* Form Lọc ngày & Tìm kiếm */}
        <form
          onSubmit={handleApplyDateRange}
          className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
        >
          <div className="md:col-span-4">
            <label
              htmlFor="staff-invoice-search"
              className="mb-1 block text-xs font-semibold text-slate-600"
            >
              Tra cứu số chứng từ, mã đơn, khách hàng hoặc người lập
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="staff-invoice-search"
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Số chứng từ, tên khách nhận hoặc nhân sự lập..."
                className="w-full rounded-xl border border-slate-200/90 bg-slate-50/50 pl-10 pr-3.5 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/15 transition-all"
              />
            </div>
          </div>

          <div className="md:col-span-3">
            <VnDateInput
              id="invoice-from-date"
              label="Từ ngày phát hành"
              value={fromVN}
              onChange={setFromVN}
              placeholder="01/09/2026"
            />
          </div>

          <div className="md:col-span-3">
            <VnDateInput
              id="invoice-to-date"
              label="Đến ngày phát hành"
              value={toVN}
              onChange={setToVN}
              placeholder="30/11/2026"
            />
          </div>

          <div className="md:col-span-2 flex items-center gap-2">
            <button
              type="submit"
              className="h-[38px] flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 transition-colors"
            >
              <Filter className="h-3.5 w-3.5" />
              <span>Lọc chứng từ</span>
            </button>

            {(fromVN ||
              toVN ||
              searchInput ||
              appliedDates.fromISO ||
              appliedDates.toISO) && (
              <button
                type="button"
                onClick={handleResetFilters}
                title="Đặt lại bộ lọc"
                className="h-[38px] inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </form>

        {/* Thanh Tổng hợp đối soát */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 px-4 py-2.5 text-xs tabular-nums">
          <div className="flex flex-wrap items-center gap-4 text-slate-600">
            <span>
              Tổng số phiếu:{' '}
              <strong className="font-bold text-slate-900">
                {invoices.length}
              </strong>
            </span>
            <span>
              Chứng từ hợp lệ:{' '}
              <strong className="font-bold text-emerald-700">
                {validInvoices.length}
              </strong>
            </span>
            {cancelledInvoicesCount > 0 && (
              <span className="text-rose-700 font-semibold">
                Chứng từ đã hủy hoàn kho: <strong>{cancelledInvoicesCount}</strong>
              </span>
            )}
          </div>

          <div className="text-slate-600">
            Tổng giá trị chứng từ hợp lệ:{' '}
            <strong className="text-sm font-bold text-emerald-700">
              {formatCurrency(totalValidAmount)}
            </strong>
          </div>
        </div>
      </section>

      {/* Bảng Danh sách Hóa đơn bán lẻ */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
            <Loader2 className="h-7 w-7 animate-spin text-emerald-700" />
            <span className="text-sm font-medium">
              Đang tải sổ chứng từ hóa đơn bán lẻ...
            </span>
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <FileText className="h-11 w-11 text-slate-300 mb-3" />
            <p className="text-sm sm:text-base font-bold text-slate-800">
              Không tìm thấy chứng từ hóa đơn phù hợp
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Vui lòng kiểm tra lại khoảng ngày phát hành hoặc chọn &ldquo;Tất
              cả chứng từ&rdquo;.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200/80 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3.5">Số chứng từ</th>
                  <th className="px-3 py-3.5">Đơn gốc</th>
                  <th className="px-4 py-3.5">Người nhận hàng</th>
                  <th className="px-4 py-3.5">Nhân sự lập phiếu</th>
                  <th className="px-4 py-3.5">Thời điểm xuất</th>
                  <th className="px-4 py-3.5 text-right">Giá trị</th>
                  <th className="px-4 py-3.5 text-center">Hiệu lực chứng từ</th>
                  <th className="px-5 py-3.5 text-right">Xem &amp; In ấn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => {
                  const isCancelled = inv.order_status === 'CANCELLED';
                  const payMeta =
                    PAYMENT_METHOD_CONFIG[inv.payment_method] ||
                    PAYMENT_METHOD_CONFIG.COD;

                  return (
                    <tr
                      key={inv.id}
                      className={`transition-colors ${
                        isCancelled
                          ? 'bg-rose-50/30 hover:bg-rose-50/55'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/staff/invoices/${inv.id}/print`)
                          }
                          className="font-mono text-xs sm:text-sm font-bold text-emerald-700 hover:underline"
                        >
                          {inv.invoice_code}
                        </button>
                        {inv.note && (
                          <p
                            className="mt-0.5 max-w-[220px] truncate text-[11px] text-slate-400"
                            title={inv.note}
                          >
                            {inv.note}
                          </p>
                        )}
                      </td>

                      <td className="px-3 py-3.5 whitespace-nowrap font-mono text-xs font-semibold text-slate-600 tabular-nums">
                        #{inv.order_id}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <p className="font-semibold text-slate-900">
                          {inv.recipient_name}
                        </p>
                        <p className="font-mono text-xs text-slate-500 tabular-nums">
                          {inv.recipient_phone}
                        </p>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <p className="font-semibold text-slate-800">
                          {inv.issued_by_name}
                        </p>
                        <span
                          className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${payMeta.badgeClass}`}
                        >
                          {payMeta.shortLabel}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap text-xs font-medium text-slate-600 tabular-nums">
                        {formatDateTime(inv.issued_date)}
                      </td>

                      <td className="px-4 py-3.5 text-right whitespace-nowrap tabular-nums">
                        <span
                          className={`font-bold ${
                            isCancelled
                              ? 'line-through text-slate-400'
                              : 'text-slate-900'
                          }`}
                        >
                          {formatCurrency(inv.total_amount)}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        {isCancelled ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span>Đã hủy • Hoàn kho</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Hợp lệ • Đã xuất kho</span>
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/staff/invoices/${inv.id}/print`)
                            }
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200/90 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Xem phiếu</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/staff/invoices/${inv.id}/print?autoprint=1`
                              )
                            }
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-800 transition-colors"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            <span>In / PDF</span>
                          </button>
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
    </div>
  );
}

export default StaffInvoicesPage;
