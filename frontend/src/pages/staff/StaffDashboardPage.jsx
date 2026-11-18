import { useCallback, useEffect, useState } from 'react';
import {
  ArrowUpRight,
  Award,
  BarChart3,
  CalendarRange,
  CheckCircle2,
  Clock,
  DollarSign,
  Loader2,
  RefreshCw,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { isCanceledRequest, staffApi } from '../../api/clients';
import { ProductImage } from '../../components/common/ProductImage';
import {
  formatCompactVnd,
  getQuickDateRangeVN,
  getStockStatusMeta,
} from '../../components/staff/staffHelpers';
import { VnDateInput } from '../../components/staff/VnDateInput';
import { useToast } from '../../contexts/ToastContext';
import {
  formatCurrency,
  getApiErrorMessage,
  isValidDDMMYYYY,
  parseDDMMYYYYToISO,
} from '../../utils/format';

const QUICK_PRESETS = [
  { key: 'all', label: 'Toàn thời gian' },
  { key: 'year_2026', label: 'Năm 2026' },
  { key: 'last_3_months', label: '3 tháng gần nhất' },
  { key: 'this_month', label: 'Tháng này' },
];

function RevenueChartTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;

  const dataPoint = payload[0]?.payload || {};
  return (
    <div className="rounded-xl border border-slate-200/90 bg-white/95 p-3.5 shadow-xl backdrop-blur-sm">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
        Kỳ báo cáo: <span className="text-slate-900">{label}</span>
      </p>
      <div className="space-y-1 text-xs sm:text-sm tabular-nums">
        <p className="flex items-center justify-between gap-5">
          <span className="flex items-center gap-1.5 text-slate-600">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-600" />
            Doanh thu thực nhận:
          </span>
          <span className="font-bold text-emerald-700">
            {formatCurrency(dataPoint.revenue || 0)}
          </span>
        </p>
        <p className="flex items-center justify-between gap-5">
          <span className="flex items-center gap-1.5 text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-800" />
            Đơn hàng hoàn tất:
          </span>
          <span className="font-semibold text-slate-900">
            {dataPoint.order_count || 0} đơn
          </span>
        </p>
      </div>
    </div>
  );
}

export function StaffDashboardPage() {
  const toast = useToast();

  const [activePreset, setActivePreset] = useState('year_2026');
  const [fromVN, setFromVN] = useState('01/01/2026');
  const [toVN, setToVN] = useState('31/12/2026');
  const [appliedRange, setAppliedRange] = useState({
    fromISO: '2026-01-01',
    toISO: '2026-12-31',
  });
  const [groupBy, setGroupBy] = useState('month');

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = useCallback(
    async (rangeISO, targetGroupBy, options = {}) => {
      const { signal } = options;
      try {
        setLoading(true);
        const params = { group_by: targetGroupBy };
        if (rangeISO.fromISO) params.from_date = rangeISO.fromISO;
        if (rangeISO.toISO) params.to_date = rangeISO.toISO;

        const res = await staffApi.get('/staff/reports/summary', {
          params,
          signal,
        });
        setReport(res.data?.data || null);
      } catch (err) {
        if (isCanceledRequest(err)) return;
        toast.error(
          getApiErrorMessage(err, 'Không thể tải báo cáo kết quả kinh doanh.')
        );
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [toast]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchReport(appliedRange, groupBy, { signal: controller.signal });
    return () => controller.abort();
  }, [appliedRange, groupBy, fetchReport]);

  const handleSelectPreset = (presetKey) => {
    const range = getQuickDateRangeVN(presetKey);
    setActivePreset(presetKey);
    setFromVN(range.fromVN);
    setToVN(range.toVN);
    setAppliedRange({ fromISO: range.fromISO, toISO: range.toISO });
  };

  const handleApplyManualFilter = (e) => {
    e.preventDefault();
    const trimmedFrom = fromVN.trim();
    const trimmedTo = toVN.trim();

    if (trimmedFrom && !isValidDDMMYYYY(trimmedFrom)) {
      toast.warning(
        'Ngày bắt đầu không hợp lệ. Vui lòng nhập đúng định dạng dd/mm/yyyy.'
      );
      return;
    }
    if (trimmedTo && !isValidDDMMYYYY(trimmedTo)) {
      toast.warning(
        'Ngày kết thúc không hợp lệ. Vui lòng nhập đúng định dạng dd/mm/yyyy.'
      );
      return;
    }

    const fromISO = trimmedFrom ? parseDDMMYYYYToISO(trimmedFrom) : '';
    const toISO = trimmedTo ? parseDDMMYYYYToISO(trimmedTo) : '';

    if (fromISO && toISO && fromISO > toISO) {
      toast.warning('Ngày bắt đầu không được lớn hơn ngày kết thúc.');
      return;
    }

    setActivePreset('custom');
    setAppliedRange({ fromISO: fromISO || '', toISO: toISO || '' });
  };

  const kpis = report?.kpis || {
    total_revenue: 0,
    approved_orders_count: 0,
    pending_orders_count: 0,
    cancelled_orders_count: 0,
    total_orders_count: 0,
    total_items_sold: 0,
  };

  const chartData = Array.isArray(report?.revenue_chart)
    ? report.revenue_chart
    : [];
  const topProducts = Array.isArray(report?.top_products)
    ? report.top_products
    : [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Thanh Bộ lọc Kỳ báo cáo & Chế độ hiển thị biểu đồ */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/15">
              <CalendarRange className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Kỳ Báo cáo Doanh thu &amp; Hiệu suất Kinh doanh
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Doanh thu thực nhận chỉ ghi nhận từ các đơn đặt hàng đã xác nhận
                và xuất kho thành công (không tính đơn chờ xác nhận hoặc đã hủy).
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-slate-200/90 bg-slate-100/80 p-1">
              <button
                type="button"
                onClick={() => setGroupBy('month')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  groupBy === 'month'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Theo tháng
              </button>
              <button
                type="button"
                onClick={() => setGroupBy('day')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  groupBy === 'day'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Theo ngày
              </button>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={() => fetchReport(appliedRange, groupBy)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
              />
              <span>Làm mới</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 border-t border-slate-100 pt-4">
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-slate-500">
              Kỳ thời gian nhanh:
            </span>
            <div className="flex flex-wrap gap-2">
              {QUICK_PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => handleSelectPreset(preset.key)}
                  className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                    activePreset === preset.key
                      ? 'bg-emerald-700 text-white shadow-sm'
                      : 'border border-slate-200/90 bg-slate-50/70 text-slate-700 hover:border-slate-300 hover:bg-slate-100/70'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <form
            onSubmit={handleApplyManualFilter}
            className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end"
          >
            <VnDateInput
              id="dash-from-date"
              label="Từ ngày"
              value={fromVN}
              onChange={(val) => {
                setFromVN(val);
                setActivePreset('custom');
              }}
              placeholder="01/01/2026"
            />

            <VnDateInput
              id="dash-to-date"
              label="Đến ngày"
              value={toVN}
              onChange={(val) => {
                setToVN(val);
                setActivePreset('custom');
              }}
              placeholder="31/12/2026"
            />

            <button
              type="submit"
              disabled={loading}
              className="h-[38px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 transition-colors"
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Áp dụng kỳ lọc</span>
            </button>
          </form>
        </div>
      </section>

      {/* 4 Thẻ KPI Kinh doanh */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1: Tổng doanh thu thực nhận */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-800/30 bg-gradient-to-br from-emerald-800 via-emerald-900 to-slate-900 p-5 text-white shadow-sm">
          <div className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full bg-emerald-400/10 blur-xl" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-200/90">
                Doanh thu thực nhận
              </p>
              <p className="mt-2 text-2xl sm:text-[26px] font-bold tracking-tight tabular-nums">
                {formatCurrency(kpis.total_revenue)}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
              <DollarSign className="h-5 w-5 text-emerald-200" />
            </div>
          </div>
          <p className="mt-3 pt-2.5 border-t border-white/10 text-xs text-emerald-100/85 flex items-center justify-between tabular-nums">
            <span>Đã đối soát chứng từ</span>
            <span className="font-semibold text-white">
              {kpis.total_items_sold} sản phẩm xuất bán
            </span>
          </p>
        </div>

        {/* KPI 2: Đơn hàng đã duyệt & xuất kho */}
        <Link
          to="/staff/orders?status=APPROVED"
          className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:border-emerald-300 hover:shadow transition-all"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Đơn đã duyệt &amp; Xuất kho
              </p>
              <p className="mt-2 text-2xl sm:text-[26px] font-bold text-slate-900 tabular-nums">
                {kpis.approved_orders_count}
                <span className="ml-1.5 text-sm font-medium text-slate-400">
                  / {kpis.total_orders_count} đơn
                </span>
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/15">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-emerald-700 font-semibold">
            <span>Đã trừ kho &amp; phát hành hóa đơn</span>
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </p>
        </Link>

        {/* KPI 3: Đơn chờ xác nhận */}
        <Link
          to="/staff/orders?status=PENDING"
          className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:border-amber-300 hover:shadow transition-all"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Đơn chờ xác nhận
              </p>
              <p className="mt-2 text-2xl sm:text-[26px] font-bold text-amber-600 tabular-nums">
                {kpis.pending_orders_count}
                <span className="ml-1.5 text-sm font-medium text-slate-400">
                  đơn hàng
                </span>
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-500/20">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-amber-700 font-semibold">
            <span>Cần đối soát tồn kho &amp; xử lý</span>
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </p>
        </Link>

        {/* KPI 4: Đơn đã hủy */}
        <Link
          to="/staff/orders?status=CANCELLED"
          className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:border-rose-300 hover:shadow transition-all"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Đơn hàng đã hủy
              </p>
              <p className="mt-2 text-2xl sm:text-[26px] font-bold text-rose-600 tabular-nums">
                {kpis.cancelled_orders_count}
                <span className="ml-1.5 text-sm font-medium text-slate-400">
                  đơn hàng
                </span>
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-inset ring-rose-500/15">
              <XCircle className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-medium group-hover:text-rose-600">
            <span>Đã hoàn nhập kho theo quy định</span>
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </p>
        </Link>
      </section>

      {/* Biểu đồ Doanh thu & Lượng đơn hàng (Recharts ComposedChart) */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/15">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Biến động Doanh thu &amp; Lượng đơn hoàn tất (
                {groupBy === 'day' ? 'Theo ngày' : 'Theo tháng'})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cột biểu diễn doanh thu thực nhận (VNĐ) • Đường biểu diễn số
                lượng đơn đã xuất kho
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex h-80 flex-col items-center justify-center gap-2 text-slate-500">
            <Loader2 className="h-7 w-7 animate-spin text-emerald-700" />
            <span className="text-sm">Đang tổng hợp số liệu kinh doanh...</span>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-72 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 text-center">
            <BarChart3 className="h-10 w-10 text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-700">
              Chưa phát sinh đơn hàng hoàn tất trong khoảng thời gian đã chọn
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Vui lòng chọn kỳ &ldquo;Năm 2026&rdquo; hoặc &ldquo;Toàn thời
              gian&rdquo; để xem dữ liệu doanh thu tổng hợp.
            </p>
          </div>
        ) : (
          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <ComposedChart
                data={chartData}
                margin={{ top: 10, right: 16, left: 4, bottom: 8 }}
              >
                <defs>
                  <linearGradient
                    id="staffRevenueBarGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#047857" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#0f766e" stopOpacity={0.75} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="revenue"
                  tickFormatter={formatCompactVnd}
                  tick={{ fill: '#475569', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={64}
                />
                <YAxis
                  yAxisId="orders"
                  orientation="right"
                  allowDecimals={false}
                  tickFormatter={(v) => `${v} đơn`}
                  tick={{ fill: '#334155', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={56}
                />
                <Tooltip content={<RevenueChartTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
                />
                <Bar
                  yAxisId="revenue"
                  dataKey="revenue"
                  name="Doanh thu thực nhận (VNĐ)"
                  fill="url(#staffRevenueBarGradient)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={52}
                />
                <Line
                  yAxisId="orders"
                  type="monotone"
                  dataKey="order_count"
                  name="Đơn hàng hoàn tất"
                  stroke="#0f172a"
                  strokeWidth={2.5}
                  dot={{ r: 4.5, fill: '#0f172a', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6.5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Bảng Sản phẩm Chủ lực Bán chạy */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-500/20">
              <Award className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Sản phẩm Chủ lực Bán chạy
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Xếp hạng theo tỷ trọng doanh thu đóng góp và sản lượng xuất bán
                thực tế
              </p>
            </div>
          </div>

          <Link
            to="/staff/products"
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
          >
            Xem toàn bộ danh mục &amp; tồn kho &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-500 gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
            <span className="text-sm">Đang tải bảng xếp hạng sản phẩm...</span>
          </div>
        ) : topProducts.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            Chưa có dữ liệu sản phẩm tiêu thụ trong kỳ báo cáo đang chọn.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200/80 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5 w-16 text-center">Hạng</th>
                  <th className="px-4 py-3.5">Sản phẩm</th>
                  <th className="px-4 py-3.5">Thương hiệu &amp; Nhóm hàng</th>
                  <th className="px-4 py-3.5 text-center">Sản lượng bán</th>
                  <th className="px-4 py-3.5 text-right">Doanh thu đóng góp</th>
                  <th className="px-5 py-3.5 text-center">Tồn kho khả dụng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topProducts.map((item, idx) => {
                  const stockMeta = getStockStatusMeta(item.current_stock);
                  const revenueShare =
                    kpis.total_revenue > 0
                      ? Math.min(
                          100,
                          Math.round(
                            (Number(item.total_revenue) / kpis.total_revenue) *
                              100
                          )
                        )
                      : 0;

                  return (
                    <tr
                      key={item.product_id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="px-5 py-3.5 text-center">
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold tabular-nums ${
                            idx === 0
                              ? 'bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-300'
                              : idx === 1
                                ? 'bg-slate-200 text-slate-800'
                                : idx === 2
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {idx + 1}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-slate-200/80 bg-white">
                            <ProductImage
                              src={item.image_url}
                              alt={item.product_name}
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 line-clamp-2">
                              {item.product_name}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
                              Mã SP: #{item.product_id}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-800">
                          {item.brand_name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {item.category_name}
                        </p>
                      </td>

                      <td className="px-4 py-3.5 text-center tabular-nums">
                        <span className="inline-flex items-center rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-600/15">
                          {item.total_quantity_sold} sản phẩm
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right tabular-nums">
                        <p className="font-bold text-slate-900">
                          {formatCurrency(item.total_revenue)}
                        </p>
                        <div className="mt-1 flex items-center justify-end gap-2">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-emerald-600"
                              style={{ width: `${revenueShare}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-medium text-slate-500">
                            {revenueShare}%
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-center tabular-nums">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${stockMeta.badgeClass}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${stockMeta.dotClass}`}
                          />
                          <span>
                            {item.current_stock} • {stockMeta.label}
                          </span>
                        </span>
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

export default StaffDashboardPage;
