import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ClipboardList,
  Loader2,
  Printer,
  Sparkles,
} from 'lucide-react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { staffApi } from '../../api/clients';
import {
  formatVietnameseLongDate,
  readVietnameseMoney,
} from '../../components/staff/staffHelpers';
import { useToast } from '../../contexts/ToastContext';
import {
  formatCurrency,
  formatDateTime,
  getApiErrorMessage,
  PAYMENT_METHOD_LABELS,
} from '../../utils/format';

/**
 * Trang In Hóa đơn Bán lẻ Chuyên nghiệp chuẩn A4 / Xuất PDF (/staff/invoices/:id/print)
 * - Gọi GET /api/staff/invoices/:id
 * - Thanh công cụ phía trên gắn class `no-print` ẩn hoàn toàn khi in giấy hoặc Save as PDF
 */
export function StaffInvoicePrintPage() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const autoPrintedRef = useRef(false);

  const fetchInvoiceDetail = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await staffApi.get(`/staff/invoices/${id}`);
      setDetail(res.data?.data || null);
    } catch (err) {
      const msg = getApiErrorMessage(
        err,
        'Không tìm thấy dữ liệu phiếu hóa đơn bán lẻ.'
      );
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    fetchInvoiceDetail();
  }, [fetchInvoiceDetail]);

  // Nếu mở từ nút "In Hóa đơn / PDF" (?autoprint=1), tự động bật hộp thoại window.print() sau khi render xong
  useEffect(() => {
    if (
      !loading &&
      detail &&
      searchParams.get('autoprint') === '1' &&
      !autoPrintedRef.current
    ) {
      autoPrintedRef.current = true;
      const timer = setTimeout(() => {
        window.print();
        const cleaned = new URLSearchParams(searchParams);
        cleaned.delete('autoprint');
        setSearchParams(cleaned, { replace: true });
      }, 350);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [loading, detail, searchParams, setSearchParams]);

  const handleTriggerPrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center gap-3 p-6">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <p className="text-sm font-medium text-slate-600">
          Đang chuẩn bị bản in Hóa đơn bán lẻ chuẩn A4...
        </p>
      </div>
    );
  }

  if (errorMsg || !detail) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md rounded-2xl border border-rose-200 bg-white p-6 shadow-lg">
          <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900">
            Không thể mở phiếu hóa đơn
          </h2>
          <p className="mt-1.5 text-sm text-slate-600">{errorMsg}</p>
          <button
            type="button"
            onClick={() => navigate('/staff/invoices')}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Quay lại danh sách hóa đơn</span>
          </button>
        </div>
      </div>
    );
  }

  const { store_info, invoice, staff, customer, items = [] } = detail;
  const totalQuantity = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0),
    0
  );
  const isOrderCancelled =
    customer?.order_status === 'CANCELLED' ||
    String(invoice?.note || '').includes('ĐÃ HỦY ĐƠN');

  const paymentLabel =
    PAYMENT_METHOD_LABELS[customer?.payment_method] ||
    customer?.payment_method ||
    'Thanh toán khi nhận hàng (COD)';

  return (
    <div className="min-h-screen bg-slate-200/80 py-6 px-3 sm:px-6 print:bg-white print:p-0 print:min-h-0">
      {/* Thanh công cụ điều khiển (Ẩn hoàn toàn khi in giấy / xuất PDF bằng class no-print) */}
      <div className="no-print print:hidden mx-auto mb-5 max-w-[210mm] rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-md flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/staff/invoices')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Quay lại Danh sách Hóa đơn</span>
          </button>

          <Link
            to="/staff/orders"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <ClipboardList className="h-4 w-4 text-emerald-600" />
            <span>Quản lý Đơn hàng</span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden md:inline text-xs text-slate-500">
            Mẹo: Chọn <strong>Save as PDF</strong> trong hộp thoại in để lưu file PDF
          </span>
          <button
            type="button"
            onClick={handleTriggerPrint}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-emerald-600/25 hover:from-emerald-700 hover:to-teal-700 transition-all"
          >
            <Printer className="h-4 w-4" />
            <span>In Hóa đơn / Lưu PDF</span>
          </button>
        </div>
      </div>

      {/* Tờ Hóa đơn Bán lẻ Chuẩn A4 */}
      <article className="relative mx-auto max-w-[210mm] rounded-none sm:rounded-xl border border-slate-300 bg-white p-6 sm:p-10 text-slate-900 shadow-2xl print:max-w-none print:rounded-none print:border-0 print:p-4 print:shadow-none">
        {/* Dấu mộc đỏ ĐÃ HỦY ĐƠN - HOÀN KHO nếu đơn hàng đã bị hủy */}
        {isOrderCancelled && (
          <div className="pointer-events-none absolute right-8 top-36 z-10 rotate-[-12deg] rounded-lg border-4 border-rose-600 bg-white/90 px-4 py-2 text-center shadow-sm">
            <p className="text-sm sm:text-base font-black uppercase tracking-widest text-rose-600">
              ĐÃ HỦY ĐƠN - HOÀN KHO
            </p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-500">
              Chứng từ lưu vết đối soát kế toán
            </p>
          </div>
        )}

        {/* Phần Đầu Trang: Thông tin Cửa hàng & Quốc hiệu Tiêu ngữ */}
        <header className="grid grid-cols-1 sm:grid-cols-12 gap-4 border-b-2 border-slate-800 pb-5">
          <div className="sm:col-span-7 space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-800 text-white">
                <Sparkles className="h-4 w-4" />
              </div>
              <h1 className="text-base sm:text-lg font-extrabold tracking-wide text-emerald-950 uppercase">
                {store_info?.name || 'LUMIÈRE COSMETICS VIETNAM'}
              </h1>
            </div>
            <p className="text-xs text-slate-700">
              <strong>Địa chỉ:</strong>{' '}
              {store_info?.address ||
                '273 An Dương Vương, Phường 3, Quận 5, TP. Hồ Chí Minh'}
            </p>
            <p className="text-xs text-slate-700">
              <strong>Hotline:</strong> {store_info?.hotline || '1900 6886'} •{' '}
              <strong>Email:</strong>{' '}
              {store_info?.email || 'contact@lumiere-cosmetics.vn'}
            </p>
            <p className="text-xs text-slate-700">
              <strong>Website:</strong>{' '}
              {store_info?.website || 'www.lumiere-cosmetics.vn'}
            </p>
          </div>

          <div className="sm:col-span-5 text-left sm:text-center flex flex-col justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-tight text-slate-900">
                CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
              </p>
              <p className="text-xs font-bold text-slate-800 underline underline-offset-4">
                Độc lập - Tự do - Hạnh phúc
              </p>
            </div>

            <div className="mt-3 sm:mt-2 text-xs text-slate-700 sm:text-right">
              <p>
                Số chứng từ:{' '}
                <strong className="font-mono text-emerald-800">
                  {invoice?.invoice_code}
                </strong>
              </p>
              <p>
                Mã đơn hàng gốc:{' '}
                <strong className="font-mono">#{invoice?.order_id}</strong>
              </p>
            </div>
          </div>
        </header>

        {/* Tiêu đề Hóa đơn */}
        <div className="py-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-black tracking-wide text-slate-900 uppercase">
            HÓA ĐƠN BÁN HÀNG
          </h2>
          <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-slate-500">
            (Kiêm Phiếu Xuất Kho Mỹ Phẩm Chính Hãng)
          </p>
          <p className="mt-2 text-xs italic text-slate-700">
            {formatVietnameseLongDate(invoice?.issued_date)} — Xuất lúc:{' '}
            {formatDateTime(invoice?.issued_date)}
          </p>
        </div>

        {/* Khối Thông tin Khách hàng & Đơn hàng */}
        <section className="mb-6 rounded-xl border border-slate-300 bg-slate-50/50 p-4 text-xs sm:text-sm space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <p>
              <span className="text-slate-600">Họ tên người nhận hàng: </span>
              <strong className="text-slate-900">
                {customer?.recipient_name}
              </strong>
            </p>
            <p>
              <span className="text-slate-600">Số điện thoại liên hệ: </span>
              <strong className="font-mono text-slate-900">
                {customer?.recipient_phone}
              </strong>
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <p>
              <span className="text-slate-600">Khách hàng thành viên: </span>
              <span className="font-semibold text-slate-800">
                {customer?.customer_name}
                {customer?.customer_email
                  ? ` (${customer.customer_email})`
                  : ''}
              </span>
            </p>
            <p>
              <span className="text-slate-600">Ngày đặt hàng: </span>
              <span className="font-medium text-slate-800">
                {formatDateTime(customer?.order_date)}
              </span>
            </p>
          </div>

          <p>
            <span className="text-slate-600">Địa chỉ giao nhận: </span>
            <strong className="font-semibold text-slate-900">
              {customer?.shipping_address}
            </strong>
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-200">
            <p>
              <span className="text-slate-600">Hình thức thanh toán: </span>
              <strong className="text-slate-900">{paymentLabel}</strong>
            </p>
            <p>
              <span className="text-slate-600">Trạng thái chứng từ: </span>
              <strong
                className={
                  isOrderCancelled ? 'text-rose-700' : 'text-emerald-800'
                }
              >
                {isOrderCancelled
                  ? 'ĐƠN ĐÃ HỦY - ĐÃ HOÀN TRẢ KHO'
                  : 'ĐÃ DUYỆT & XUẤT KHO HỢP LỆ'}
              </strong>
            </p>
          </div>
        </section>

        {/* Bảng Chi tiết Mặt hàng Mỹ phẩm */}
        <section className="mb-5">
          <table className="w-full border-collapse border border-slate-400 text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-100 text-slate-900">
                <th className="border border-slate-400 px-2.5 py-2.5 text-center w-12 font-bold">
                  STT
                </th>
                <th className="border border-slate-400 px-3 py-2.5 text-left font-bold">
                  Tên mỹ phẩm &amp; Thương hiệu
                </th>
                <th className="border border-slate-400 px-2.5 py-2.5 text-center w-24 font-bold">
                  Dung tích
                </th>
                <th className="border border-slate-400 px-3 py-2.5 text-right w-28 font-bold">
                  Đơn giá
                </th>
                <th className="border border-slate-400 px-2.5 py-2.5 text-center w-16 font-bold">
                  SL
                </th>
                <th className="border border-slate-400 px-3 py-2.5 text-right w-32 font-bold">
                  Thành tiền
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id || index} className="break-inside-avoid">
                  <td className="border border-slate-300 px-2.5 py-2.5 text-center font-medium">
                    {index + 1}
                  </td>
                  <td className="border border-slate-300 px-3 py-2.5">
                    <p className="font-semibold text-slate-900 leading-snug">
                      {item.product_name}
                    </p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Thương hiệu: <strong>{item.brand_name}</strong> • Mã SP: #
                      {item.product_id}
                    </p>
                  </td>
                  <td className="border border-slate-300 px-2.5 py-2.5 text-center text-slate-700">
                    {item.volume || 'Tiêu chuẩn'}
                  </td>
                  <td className="border border-slate-300 px-3 py-2.5 text-right font-medium whitespace-nowrap">
                    {formatCurrency(item.unit_price)}
                  </td>
                  <td className="border border-slate-300 px-2.5 py-2.5 text-center font-bold">
                    {item.quantity}
                  </td>
                  <td className="border border-slate-300 px-3 py-2.5 text-right font-bold whitespace-nowrap">
                    {formatCurrency(item.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="print:table-row-group">
              <tr className="bg-slate-50 break-inside-avoid">
                <td
                  colSpan={4}
                  className="border border-slate-400 px-3 py-2 text-right font-semibold text-slate-700"
                >
                  Tổng số lượng mỹ phẩm xuất kho:
                </td>
                <td className="border border-slate-400 px-2.5 py-2 text-center font-bold text-slate-900">
                  {totalQuantity}
                </td>
                <td className="border border-slate-400 px-3 py-2 text-right text-xs text-slate-600">
                  Phí giao hàng: 0 ₫
                </td>
              </tr>
              <tr className="bg-emerald-50/70 break-inside-avoid">
                <td
                  colSpan={5}
                  className="border border-slate-400 px-3 py-3 text-right text-sm sm:text-base font-extrabold uppercase text-slate-900"
                >
                  Tổng cộng thanh toán:
                </td>
                <td className="border border-slate-400 px-3 py-3 text-right text-base sm:text-lg font-black text-emerald-900 whitespace-nowrap">
                  {formatCurrency(invoice?.total_amount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </section>

        {/* Số tiền bằng chữ & Ghi chú hóa đơn */}
        <section className="mb-8 space-y-2 text-xs sm:text-sm">
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5">
            <span className="font-semibold text-slate-700">
              Số tiền viết bằng chữ:{' '}
            </span>
            <strong className="italic text-slate-900">
              {readVietnameseMoney(invoice?.total_amount)}.
            </strong>
          </p>

          {(invoice?.note || customer?.order_note) && (
            <div className="rounded-lg border border-slate-200 px-3.5 py-2.5 space-y-1">
              {invoice?.note && (
                <p>
                  <strong className="text-slate-700">Ghi chú hóa đơn: </strong>
                  <span
                    className={
                      isOrderCancelled
                        ? 'font-bold text-rose-700'
                        : 'text-slate-800'
                    }
                  >
                    {invoice.note}
                  </span>
                </p>
              )}
              {customer?.order_note && (
                <p className="text-xs text-slate-600">
                  <strong>Ghi chú giao hàng của khách: </strong>
                  {customer.order_note}
                </p>
              )}
            </div>
          )}
        </section>

        {/* Khu vực Chữ ký 2 Bên */}
        <section className="grid grid-cols-2 gap-6 pt-2 text-center text-xs sm:text-sm break-inside-avoid">
          <div>
            <p className="font-bold uppercase text-slate-900">KHÁCH MUA HÀNG</p>
            <p className="text-xs italic text-slate-500">
              (Ký, ghi rõ họ tên khi nhận hàng)
            </p>
            <div className="h-24" />
            <p className="font-semibold text-slate-800">
              {customer?.recipient_name}
            </p>
          </div>

          <div>
            <p className="font-bold uppercase text-slate-900">
              NHÂN VIÊN LẬP PHIẾU
            </p>
            <p className="text-xs italic text-slate-500">
              (Ký, đóng dấu &amp; ghi rõ họ tên)
            </p>
            <div className="flex h-24 items-center justify-center">
              <div className="rounded-lg border border-emerald-600/40 bg-emerald-50/50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                Đã xác nhận xuất kho • Lumière Retail
              </div>
            </div>
            <p className="font-bold text-slate-900">
              {staff?.full_name || 'Nhân viên bán hàng'}
            </p>
            {staff?.username && (
              <p className="text-[11px] text-slate-500">
                Mã NV: @{staff.username}
              </p>
            )}
          </div>
        </section>

        {/* Lời cảm ơn cuối trang */}
        <footer className="mt-8 border-t border-dashed border-slate-300 pt-4 text-center text-[11px] text-slate-500">
          <p className="font-semibold text-slate-700">
            Cảm ơn Quý khách đã tin tưởng lựa chọn mỹ phẩm chính hãng tại
            Lumière Cosmetics Vietnam!
          </p>
          <p className="mt-0.5">
            Cam kết 100% sản phẩm chính hãng • Hỗ trợ đổi trả trong 07 ngày nếu
            lỗi từ nhà sản xuất • Hotline CSKH: {store_info?.hotline || '1900 6886'}
          </p>
        </footer>
      </article>
    </div>
  );
}

export default StaffInvoicePrintPage;
