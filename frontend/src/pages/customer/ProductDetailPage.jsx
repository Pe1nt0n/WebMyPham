import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  Droplets,
  Gift,
  Globe2,
  Minus,
  PackageCheck,
  Plus,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Truck,
  Zap,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getApiErrorMessage, isCanceledRequest, publicApi } from '../../api/clients';
import { ProductImage } from '../../components/common/ProductImage';
import { ProductCard } from '../../components/customer/ProductCard';
import { useCart } from '../../contexts/CartContext';
import { useToast } from '../../contexts/ToastContext';
import { formatCurrency } from '../../utils/format';

const DETAIL_TABS = [
  { id: 'benefits', label: 'Công dụng & Thành phần nổi bật' },
  { id: 'usage', label: 'Hướng dẫn sử dụng chuẩn chuyên gia' },
  { id: 'authenticity', label: 'Cam kết chính hãng & Giao nhận' },
];

function buildExpertUsageSteps(product) {
  const cat = String(product?.category_name || '').toLowerCase();
  const name = String(product?.name || '').toLowerCase();

  if (cat.includes('nắng') || name.includes('chống nắng')) {
    return [
      {
        step: 'Bước 01 • Lượng dùng tiêu chuẩn',
        detail:
          'Lấy lượng kem/sữa chống nắng tương đương 2 đốt ngón tay cho toàn bộ khuôn mặt và 1 đốt ngón tay cho vùng cổ sau bước dưỡng ẩm sáng.',
      },
      {
        step: 'Bước 02 • Thoa vỗ đều nhẹ nhàng',
        detail:
          'Chấm thành nhiều điểm nhỏ trên trán, hai má, mũi và cằm rồi vỗ nhẹ theo chiều nâng cơ để màng lọc UV dàn trải đồng đều, tiệp mịn vào da.',
      },
      {
        step: 'Bước 03 • Duy trì hiệu quả bảo vệ',
        detail:
          'Sử dụng trước khi ra nắng 15–20 phút. Nên thoa dặm lại sau mỗi 3–4 giờ nếu hoạt động ngoài trời liên tục và tẩy trang kỹ vào cuối ngày.',
      },
    ];
  }

  if (cat.includes('hoa') || name.includes('nước hoa')) {
    return [
      {
        step: 'Bước 01 • Dưỡng ẩm vùng da xịt hương',
        detail:
          'Sử dụng ngay sau khi tắm hoặc thoa một lớp kem dưỡng thể không mùi giúp giữ các phân tử tinh dầu hương hoa bám tỏa lâu hơn gấp đôi.',
      },
      {
        step: 'Bước 02 • Điểm mạch tỏa hương vàng',
        detail:
          'Giữ vòi xịt cách da 15–20 cm, hướng vào các vùng mạch đập ấm như cổ tay trong, sau tai, hõm ngực hoặc gáy.',
      },
      {
        step: 'Bước 03 • Bảo toàn cấu trúc tầng hương',
        detail:
          'Để sương nước hoa khô tự nhiên trên da; tuyệt đối không chà xát hai cổ tay vào nhau nhằm giữ trọn nốt hương đầu thanh khiết.',
      },
    ];
  }

  if (cat.includes('trang điểm') || name.includes('son') || name.includes('phấn')) {
    return [
      {
        step: 'Bước 01 • Chuẩn bị bề mặt ẩm mịn',
        detail:
          'Cấp ẩm nhẹ cho da hoặc dưỡng mềm môi trước 3–5 phút rồi thấm bớt lớp dầu thừa để sắc màu lên chuẩn xác và mịn mượt nhất.',
      },
      {
        step: 'Bước 02 • Tán mỏng nhiều lớp (Layering)',
        detail:
          'Lấy lượng vừa đủ, tán mỏng từ trung tâm ra ngoài bằng bông mút hoặc đầu cọ chuyên dụng để tạo hiệu ứng tự nhiên không dày bí.',
      },
      {
        step: 'Bước 03 • Làm sạch dịu nhẹ cuối ngày',
        detail:
          'Sử dụng nước tẩy trang Micellar hoặc dầu tẩy trang chuyên dụng vào buổi tối để làn da và đôi môi luôn thông thoáng, tươi tắn.',
      },
    ];
  }

  if (cat.includes('cơ thể') || cat.includes('tóc')) {
    return [
      {
        step: 'Bước 01 • Làm sạch vùng da / mái tóc',
        detail:
          'Làm ướt cơ thể hoặc làm sạch da đầu, thấm khô nhẹ bằng khăn bông mềm để giữ độ ẩm tự nhiên trước khi thoa sản phẩm.',
      },
      {
        step: 'Bước 02 • Massage kích thích thẩm thấu',
        detail:
          'Thoa đều sản phẩm và kết hợp chuyển động massage tròn nhẹ nhàng từ 2–3 phút giúp dưỡng chất thực vật thấm sâu nuôi dưỡng.',
      },
      {
        step: 'Bước 03 • Duy trì tần suất đều đặn',
        detail:
          'Sử dụng định kỳ hằng ngày (đối với xịt dưỡng/dưỡng thể) hoặc 2–3 lần/tuần (đối với tẩy tế bào chết cơ thể) để đạt hiệu quả tối ưu.',
      },
    ];
  }

  return [
    {
      step: 'Bước 01 • Làm sạch bề mặt da',
      detail:
        'Thực hiện sau bước tẩy trang và sữa rửa mặt dịu nhẹ khi da còn độ ẩm tự nhiên giúp hoạt chất dẫn truyền sâu hơn vào biểu bì.',
    },
    {
      step: 'Bước 02 • Thoa tinh chất / dung dịch vừa đủ',
      detail:
        'Lấy 3–4 giọt tinh chất (hoặc thấm qua bông cotton mềm), áp nhẹ hai lòng bàn tay ấm lên toàn mặt theo hướng từ trong ra ngoài.',
    },
    {
      step: 'Bước 03 • Khóa ẩm & Bảo vệ ban ngày',
      detail:
        'Chờ khoảng 60 giây để sản phẩm thẩm thấu hoàn toàn trước khi thoa kem khóa ẩm. Luôn kết hợp kem chống nắng SPF50+ vào buổi sáng.',
    },
  ];
}

export function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, getItemQuantity } = useCart();
  const toast = useToast();

  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('benefits');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setQuantity(1);
    setActiveTab('benefits');

    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    publicApi
      .get(`/products/${id}`, { signal: controller.signal })
      .then(async (res) => {
        const detail = res.data?.data;
        setProduct(detail);

        if (detail?.category_id) {
          try {
            const relRes = await publicApi.get('/products', {
              params: { category_id: detail.category_id },
              signal: controller.signal,
            });
            const list = Array.isArray(relRes.data?.data) ? relRes.data.data : [];
            setRelatedProducts(
              list.filter((item) => Number(item.id) !== Number(detail.id)).slice(0, 4)
            );
          } catch (relErr) {
            if (!isCanceledRequest(relErr)) {
              setRelatedProducts([]);
            }
          }
        } else {
          setRelatedProducts([]);
        }
      })
      .catch((err) => {
        if (isCanceledRequest(err)) return;
        setError(getApiErrorMessage(err, 'Không tìm thấy sản phẩm mỹ phẩm theo yêu cầu.'));
        setProduct(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [id]);

  const stock = Math.max(0, Number(product?.stock_quantity ?? 0));
  const inCartQty = product ? getItemQuantity(product.id) : 0;
  const maxAddable = Math.max(0, stock - inCartQty);
  const isOutOfStock = stock <= 0;
  const isLowStock = stock > 0 && stock <= 5;

  // Giữ quantity luôn hợp lệ khi tồn kho hoặc giỏ hàng thay đổi
  useEffect(() => {
    if (maxAddable > 0 && quantity > maxAddable) {
      setQuantity(maxAddable);
    } else if (maxAddable > 0 && quantity < 1) {
      setQuantity(1);
    }
  }, [maxAddable, quantity]);

  const usageSteps = useMemo(() => buildExpertUsageSteps(product), [product]);

  // Loại bỏ chú thích nội bộ kiểu "(Tạm hết hàng)." hay "(Mặt hàng sắp hết kho)." nếu có trong dữ liệu mô tả
  const cleanDescription = useMemo(() => {
    const raw =
      product?.description ||
      'Sản phẩm chính ngạch được tuyển chọn và bảo quản trong điều kiện nhiệt độ tiêu chuẩn tại Lumière Beauté Vietnam, giữ trọn vẹn hiệu năng hoạt chất chăm sóc làn da.';
    return String(raw)
      .replace(/\s*\((Mặt hàng sắp hết kho|Tạm hết hàng)\)\.?\s*$/i, '')
      .trim();
  }, [product?.description]);

  const handleDecrease = () => {
    setQuantity((prev) => Math.max(1, prev - 1));
  };

  const handleIncrease = () => {
    if (quantity >= maxAddable) {
      toast.warning(`Bạn chỉ có thể chọn thêm tối đa ${maxAddable} sản phẩm theo số lượng hiện có.`);
      return;
    }
    setQuantity((prev) => Math.min(maxAddable, prev + 1));
  };

  const handleQuantityInput = (event) => {
    const raw = event.target.value;
    if (raw === '') {
      setQuantity(1);
      return;
    }
    const parsed = Math.floor(Number(raw));
    if (!Number.isFinite(parsed) || parsed < 1) {
      setQuantity(1);
      return;
    }
    if (parsed > maxAddable) {
      setQuantity(maxAddable);
      toast.warning(`Hiện chỉ có thể chọn thêm tối đa ${maxAddable} sản phẩm.`);
      return;
    }
    setQuantity(parsed);
  };

  const handleAddToCart = () => {
    if (!product || maxAddable <= 0) return;
    const result = addToCart(product, quantity);
    if (result.ok) {
      toast.success(`Đã thêm ${quantity} "${product.name}" vào túi mua sắm!`, {
        title: 'Lumière Beauté',
      });
      setQuantity(1);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('lumiere:open-cart-drawer'));
      }
    }
  };

  const handleBuyNow = () => {
    if (!product || isOutOfStock) return;

    if (maxAddable > 0) {
      const result = addToCart(product, quantity, { silent: true });
      if (!result.ok) {
        toast.warning(result.message);
        return;
      }
    } else if (inCartQty <= 0) {
      return;
    }

    navigate('/checkout');
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-pulse">
          <div className="lg:col-span-6 aspect-square rounded-3xl bg-white border border-stone-200/80" />
          <div className="lg:col-span-6 space-y-5 py-4">
            <div className="h-4 w-1/3 rounded bg-champagne-100" />
            <div className="h-9 w-4/5 rounded bg-stone-200" />
            <div className="h-5 w-2/5 rounded bg-stone-100" />
            <div className="h-28 w-full rounded-3xl bg-white border border-stone-200/80" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-20 rounded-2xl bg-stone-100" />
              <div className="h-20 rounded-2xl bg-stone-100" />
            </div>
            <div className="h-14 w-full rounded-full bg-stone-200" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-16 text-center">
        <div className="rounded-3xl border border-stone-200/80 bg-white p-10 shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mb-4">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-stone-950">
            Sản phẩm hiện không khả dụng
          </h1>
          <p className="mt-2 text-sm text-stone-600">
            {error || 'Dòng mỹ phẩm bạn tìm kiếm không tồn tại hoặc tạm ngừng phân phối.'}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/products"
              className="inline-flex items-center gap-2 rounded-full bg-stone-950 px-6 py-3 text-sm font-bold text-white hover:bg-lumiere-800 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Quay lại Cửa hàng Mỹ phẩm</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const skuCode = `LUM-${String(product.id).padStart(4, '0')}`;
  const lowStockPercent = Math.min(100, Math.max(16, Math.round((stock / 6) * 100)));

  return (
    <div className="pb-20">
      {/* Breadcrumb Bar: Trang chủ / {category_name} / {name} */}
      <div className="border-b border-stone-200/70 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3.5">
          <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-stone-500"
          >
            <Link to="/" className="hover:text-lumiere-700 transition-colors">
              Trang chủ
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-stone-400 shrink-0" />
            {product.category_name ? (
              <Link
                to={`/products?category_id=${product.category_id}`}
                className="hover:text-lumiere-700 transition-colors"
              >
                {product.category_name}
              </Link>
            ) : (
              <Link to="/products" className="hover:text-lumiere-700 transition-colors">
                Cửa hàng mỹ phẩm
              </Link>
            )}
            <ChevronRight className="h-3.5 w-3.5 text-stone-400 shrink-0" />
            <span className="text-stone-900 font-semibold truncate max-w-[240px] sm:max-w-md">
              {product.name}
            </span>
          </nav>
        </div>
      </div>

      {/* Main Showcase Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* LEFT COLUMN: Cream Luxury Gallery Frame + Authenticity Seal */}
          <div className="lg:col-span-6 lg:sticky lg:top-24 space-y-4">
            <div className="relative overflow-hidden rounded-3xl border border-champagne-200/80 bg-gradient-to-br from-champagne-50 via-stone-50 to-lumiere-50/40 p-4 sm:p-6 shadow-sm">
              <div className="relative aspect-square overflow-hidden rounded-2xl bg-champagne-50/80 ring-1 ring-stone-900/5">
                <ProductImage
                  src={product.image_url}
                  alt={product.name}
                  loading="eager"
                  showFallbackCaption
                  className="h-full w-full transition-transform duration-700 hover:scale-105"
                />

                {/* Top-Left Official Authenticity Badge */}
                <div className="absolute left-3.5 top-3.5 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-bold text-stone-900 shadow-sm ring-1 ring-stone-900/5 backdrop-blur-md">
                  <BadgeCheck className="h-3.5 w-3.5 text-lumiere-700 shrink-0" />
                  <span>100% Chính Ngạch</span>
                </div>

                {/* Top-Right Volume Tag */}
                {product.volume && (
                  <div className="absolute right-3.5 top-3.5 rounded-full bg-stone-950/80 px-3 py-1 text-[11px] font-semibold text-champagne-100 backdrop-blur-md">
                    {product.volume}
                  </div>
                )}

                {isOutOfStock && (
                  <div className="absolute inset-0 bg-stone-950/40 backdrop-blur-[1.5px] flex items-center justify-center">
                    <span className="rounded-full bg-stone-950/90 px-6 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-widest text-white shadow-xl">
                      Tạm hết hàng
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Subtle Boutique Assurance Trio under Gallery */}
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="rounded-2xl border border-stone-200/70 bg-white px-3 py-3">
                <ShieldCheck className="mx-auto h-4 w-4 text-lumiere-700 mb-1" />
                <p className="text-[11px] font-semibold text-stone-800">Đầy đủ tem phụ</p>
              </div>
              <div className="rounded-2xl border border-stone-200/70 bg-white px-3 py-3">
                <Truck className="mx-auto h-4 w-4 text-lumiere-700 mb-1" />
                <p className="text-[11px] font-semibold text-stone-800">Giao nhanh 2H</p>
              </div>
              <div className="rounded-2xl border border-stone-200/70 bg-white px-3 py-3">
                <RotateCcw className="mx-auto h-4 w-4 text-lumiere-700 mb-1" />
                <p className="text-[11px] font-semibold text-stone-800">Đổi trả 14 ngày</p>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Luxury Buy Box & Specifications */}
          <div className="lg:col-span-6 space-y-6">
            {/* Brand + Origin + SKU */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to={`/products?brand_id=${product.brand_id}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-stone-950 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-white hover:bg-lumiere-800 transition-colors"
                >
                  <span>{product.brand_name || 'Lumière'}</span>
                </Link>
                {product.brand_origin && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-champagne-300/80 bg-champagne-50 px-3 py-1 text-xs font-semibold text-champagne-900">
                    <Globe2 className="h-3 w-3 text-champagne-700" />
                    <span>Xuất xứ: {product.brand_origin}</span>
                  </span>
                )}
              </div>

              <span className="text-xs font-medium text-stone-400">Mã SP: {skuCode}</span>
            </div>

            {/* Large Serif Product Name */}
            <div className="space-y-3">
              <h1 className="font-serif text-2xl sm:text-3xl lg:text-[2.15rem] font-bold leading-[1.2] text-stone-950">
                {product.name}
              </h1>

              {/* Customer Rating Strip: 4.9/5 (128 đánh giá khách hàng) */}
              <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
                <div className="inline-flex items-center gap-1 text-amber-500" aria-label="Đánh giá 4.9 trên 5 sao">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                  <span className="ml-1 font-bold text-stone-900">4.9/5</span>
                </div>
                <span className="text-stone-300">|</span>
                <span className="text-stone-600 font-medium">128 đánh giá khách hàng</span>
                {product.category_name && (
                  <>
                    <span className="text-stone-300 hidden sm:inline">|</span>
                    <Link
                      to={`/products?category_id=${product.category_id}`}
                      className="font-semibold text-lumiere-700 hover:underline hidden sm:inline"
                    >
                      {product.category_name}
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Refined Price Box & Aesthetic Stock Bar */}
            <div className="rounded-3xl border border-champagne-200/90 bg-gradient-to-br from-champagne-50/70 via-white to-lumiere-50/50 p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-widest text-stone-400">
                    Giá niêm yết chính hãng
                  </span>
                  <div className="mt-1 flex items-baseline gap-2.5">
                    <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-lumiere-700">
                      {formatCurrency(product.price)}
                    </span>
                    <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600">
                      Đã gồm VAT
                    </span>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 shadow-sm ring-1 ring-stone-200/80">
                  <Gift className="h-3.5 w-3.5 text-lumiere-600" />
                  <span>Tặng kèm Sample dưỡng da</span>
                </span>
              </div>

              {/* Aesthetic Stock Status Indicator */}
              <div className="border-t border-champagne-200/70 pt-3.5 space-y-2">
                {isOutOfStock ? (
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-stone-500">
                    <span className="h-2 w-2 rounded-full bg-stone-400" />
                    <span>Sản phẩm tạm hết hàng — Đang cập nhật đợt nhập khẩu tiếp theo</span>
                  </div>
                ) : isLowStock ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
                      <span className="inline-flex items-center gap-1.5 font-bold text-amber-700">
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                        <span>Còn {stock} sản phẩm sẵn sàng giao ngay — Sắp hết!</span>
                      </span>
                      <span className="text-[11px] font-semibold text-amber-700">Số lượng giới hạn</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-amber-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                        style={{ width: `${lowStockPercent}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                      <PackageCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Còn {stock} sản phẩm sẵn sàng giao ngay</span>
                    </span>
                    <span className="text-xs text-stone-500">Giao miễn phí toàn quốc</span>
                  </div>
                )}

                {inCartQty > 0 && (
                  <p className="rounded-xl bg-lumiere-50/90 border border-lumiere-100 px-3 py-2 text-xs font-medium text-lumiere-900">
                    Trong giỏ hàng của bạn đang có <strong>{inCartQty}</strong> sản phẩm này
                    {maxAddable > 0
                      ? ` (có thể chọn thêm tối đa ${maxAddable} sản phẩm).`
                      : ' (đã đạt số lượng tối đa hiện có).'}
                  </p>
                )}
              </div>
            </div>

            {/* Specification Cards: Dung tích & Loại da khuyên dùng */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="flex items-start gap-3.5 rounded-2xl border border-stone-200/90 bg-white p-4 shadow-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-champagne-100/70 text-champagne-800">
                  <Droplets className="h-5 w-5" />
                </div>
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-400">
                    Dung tích / Quy cách
                  </span>
                  <p className="mt-0.5 text-sm sm:text-base font-bold text-stone-900">
                    {product.volume || 'Bản tiêu chuẩn Fullsize'}
                  </p>
                </div>
              </div>

              <Link
                to={`/products?skin_type=${encodeURIComponent(
                  product.skin_type || 'Mọi loại da'
                )}`}
                className="group flex items-start justify-between gap-3 rounded-2xl border border-stone-200/90 bg-white p-4 shadow-sm hover:border-lumiere-400 transition-colors"
              >
                <div className="flex items-start gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lumiere-50 text-lumiere-700">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-400">
                      Loại da khuyên dùng
                    </span>
                    <p className="mt-0.5 text-sm sm:text-base font-bold text-stone-900 group-hover:text-lumiere-700 transition-colors">
                      {product.skin_type || 'Mọi loại da'}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-stone-300 group-hover:text-lumiere-600 mt-1 shrink-0" />
              </Link>
            </div>

            {/* Quantity Stepper & Purchase CTA Buttons */}
            <div className="space-y-4 pt-1">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <span className="text-sm font-bold text-stone-800">Số lượng:</span>

                  <div className="inline-flex items-center rounded-full border border-stone-300 bg-white p-1 shadow-sm">
                    <button
                      type="button"
                      onClick={handleDecrease}
                      disabled={maxAddable <= 0 || quantity <= 1}
                      aria-label="Giảm số lượng"
                      className="flex h-9 w-9 items-center justify-center rounded-full text-stone-700 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-35 transition-colors"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <input
                      type="number"
                      min={maxAddable > 0 ? 1 : 0}
                      max={maxAddable}
                      value={maxAddable > 0 ? quantity : 0}
                      onChange={handleQuantityInput}
                      disabled={maxAddable <= 0}
                      aria-label="Số lượng mua"
                      className="w-12 bg-transparent text-center text-sm font-extrabold text-stone-950 focus:outline-none disabled:text-stone-400"
                    />
                    <button
                      type="button"
                      onClick={handleIncrease}
                      disabled={maxAddable <= 0 || quantity >= maxAddable}
                      aria-label="Tăng số lượng"
                      className="flex h-9 w-9 items-center justify-center rounded-full text-stone-700 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-35 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {!isOutOfStock && maxAddable > 0 && (
                  <span className="text-xs font-medium text-stone-500">
                    Tạm tính:{' '}
                    <strong className="text-stone-900 font-bold">
                      {formatCurrency(Number(product.price) * quantity)}
                    </strong>
                  </span>
                )}
              </div>

              {/* Action Buttons: Thêm Vào Giỏ Hàng & Mua Ngay */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={isOutOfStock || maxAddable <= 0}
                  className={`inline-flex items-center justify-center gap-2.5 rounded-full px-6 py-4 text-sm font-bold transition-all ${
                    isOutOfStock || maxAddable <= 0
                      ? 'cursor-not-allowed border border-stone-200 bg-stone-100 text-stone-400'
                      : 'border-2 border-stone-950 bg-white text-stone-950 hover:bg-stone-950 hover:text-white active:scale-[0.99]'
                  }`}
                >
                  <ShoppingBag className="h-4 w-4 shrink-0" />
                  <span>
                    {isOutOfStock
                      ? 'Tạm Hết Hàng'
                      : maxAddable <= 0
                        ? `Đã Đạt Tối Đa (${inCartQty})`
                        : 'Thêm Vào Giỏ Hàng'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleBuyNow}
                  disabled={isOutOfStock}
                  className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-4 text-sm font-bold transition-all ${
                    isOutOfStock
                      ? 'cursor-not-allowed bg-stone-200 text-stone-400'
                      : 'bg-lumiere-700 text-white shadow-lg shadow-lumiere-800/25 hover:bg-lumiere-800 active:scale-[0.99]'
                  }`}
                >
                  <Zap className="h-4 w-4 shrink-0" />
                  <span>{maxAddable <= 0 && inCartQty > 0 ? 'Thanh Toán Ngay' : 'Mua Ngay'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 3 DEEP-DIVE EDITORIAL INFORMATION TABS */}
        <div className="mt-14 overflow-hidden rounded-3xl border border-stone-200/90 bg-white shadow-sm">
          {/* Tab Header */}
          <div
            role="tablist"
            aria-label="Thông tin chuyên sâu sản phẩm"
            className="flex flex-wrap border-b border-stone-200/80 bg-stone-50/60 px-4 sm:px-8 pt-2 gap-2 sm:gap-6"
          >
            {DETAIL_TABS.map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative py-3.5 text-xs sm:text-sm font-bold transition-colors ${
                    isSelected
                      ? 'text-lumiere-800'
                      : 'text-stone-500 hover:text-stone-900'
                  }`}
                >
                  <span>{tab.label}</span>
                  {isSelected && (
                    <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-lumiere-700" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab Body */}
          <div className="p-6 sm:p-8 lg:p-10 animate-fade-in" key={activeTab}>
            {activeTab === 'benefits' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-8 space-y-4">
                  <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-950">
                    Hiệu Năng Nổi Bật &amp; Điểm Sáng Công Thức
                  </h2>
                  <p className="whitespace-pre-line text-sm sm:text-base leading-relaxed text-stone-700">
                    {cleanDescription}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="flex items-start gap-2.5 rounded-2xl bg-champagne-50/70 p-4 border border-champagne-200/60">
                      <CheckCircle2 className="h-4 w-4 text-lumiere-700 shrink-0 mt-0.5" />
                      <div className="text-xs sm:text-sm text-stone-700">
                        <strong className="block text-stone-900 mb-0.5">
                          Tương thích sinh học cao
                        </strong>
                        Kết cấu thẩm thấu nhanh, thoáng nhẹ phù hợp khí hậu nhiệt đới Việt Nam.
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5 rounded-2xl bg-champagne-50/70 p-4 border border-champagne-200/60">
                      <CheckCircle2 className="h-4 w-4 text-lumiere-700 shrink-0 mt-0.5" />
                      <div className="text-xs sm:text-sm text-stone-700">
                        <strong className="block text-stone-900 mb-0.5">
                          Kiểm nghiệm da liễu nghiêm ngặt
                        </strong>
                        Thiết kế chuyên biệt cho làn da:{' '}
                        <strong>{product.skin_type || 'Mọi loại da'}</strong>.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-4 rounded-2xl border border-stone-200/80 bg-stone-50/70 p-5 space-y-3 text-xs sm:text-sm">
                  <h3 className="font-serif text-base font-bold text-stone-950 border-b border-stone-200 pb-2.5">
                    Hồ Sơ Chi Tiết Sản Phẩm
                  </h3>
                  <div className="flex justify-between gap-2 py-1">
                    <span className="text-stone-500">Thương hiệu</span>
                    <span className="font-semibold text-stone-900">{product.brand_name}</span>
                  </div>
                  <div className="flex justify-between gap-2 py-1 border-t border-stone-200/60">
                    <span className="text-stone-500">Xuất xứ</span>
                    <span className="font-semibold text-stone-900">
                      {product.brand_origin || 'Chính hãng'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2 py-1 border-t border-stone-200/60">
                    <span className="text-stone-500">Dung tích</span>
                    <span className="font-semibold text-stone-900">
                      {product.volume || 'Tiêu chuẩn'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2 py-1 border-t border-stone-200/60">
                    <span className="text-stone-500">Loại da khuyên dùng</span>
                    <span className="font-semibold text-lumiere-800">
                      {product.skin_type || 'Mọi loại da'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2 py-1 border-t border-stone-200/60">
                    <span className="text-stone-500">Hạn sử dụng</span>
                    <span className="font-semibold text-emerald-700">Lô mới 2026 – 2029</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'usage' && (
              <div className="space-y-6">
                <div className="max-w-2xl">
                  <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-950 flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-lumiere-700" />
                    <span>Phác Đồ Sử Dụng Đạt Hiệu Quả Tối Đa</span>
                  </h2>
                  <p className="mt-1.5 text-sm text-stone-600">
                    Lời khuyên từ đội ngũ chuyên viên da liễu &amp; nghệ sĩ trang điểm tại Lumière
                    Beauté dành riêng cho dòng sản phẩm <strong>{product.name}</strong>.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {usageSteps.map((u) => (
                    <div
                      key={u.step}
                      className="rounded-2xl border border-champagne-200/90 bg-champagne-50/40 p-5 space-y-2"
                    >
                      <p className="text-xs font-bold uppercase tracking-wider text-lumiere-700">
                        {u.step}
                      </p>
                      <p className="text-sm leading-relaxed text-stone-700">{u.detail}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-xs sm:text-sm text-stone-600">
                  <strong className="text-stone-900">Lưu ý bảo quản chuẩn hãng:</strong> Đậy kín nắp
                  ngay sau khi sử dụng, đặt sản phẩm ở nơi khô thoáng (18°C – 25°C), tránh ánh nắng
                  chiếu trực tiếp và nơi có độ ẩm cao như phòng tắm.
                </div>
              </div>
            )}

            {activeTab === 'authenticity' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="rounded-2xl border border-stone-200/80 p-5 space-y-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <h3 className="font-serif text-lg font-bold text-stone-950">
                    Bảo Chứng Chính Ngạch 200%
                  </h3>
                  <p className="text-xs sm:text-sm leading-relaxed text-stone-600">
                    100% sản phẩm tại Lumière được phân phối trực tiếp từ hãng và nhà nhập khẩu độc
                    quyền, nguyên seal niêm phong, tem phụ tiếng Việt và phát hành hóa đơn bán lẻ
                    điện tử minh bạch.
                  </p>
                </div>

                <div className="rounded-2xl border border-stone-200/80 p-5 space-y-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lumiere-50 text-lumiere-700">
                    <Clock className="h-5 w-5" />
                  </div>
                  <h3 className="font-serif text-lg font-bold text-stone-950">
                    Vận Chuyển Chống Sốc &amp; Giao Nhanh 2H
                  </h3>
                  <p className="text-xs sm:text-sm leading-relaxed text-stone-600">
                    Đóng gói hộp cứng 3 lớp bọc chống sốc bảo vệ chai lọ thủy tinh. Hỗ trợ giao hỏa
                    tốc 2 giờ tại TP. Hồ Chí Minh và miễn phí giao tiêu chuẩn toàn quốc.
                  </p>
                </div>

                <div className="rounded-2xl border border-stone-200/80 p-5 space-y-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-champagne-100/80 text-champagne-800">
                    <RotateCcw className="h-5 w-5" />
                  </div>
                  <h3 className="font-serif text-lg font-bold text-stone-950">
                    Đổi Trả An Tâm Trong 14 Ngày
                  </h3>
                  <p className="text-xs sm:text-sm leading-relaxed text-stone-600">
                    Quý khách được đồng kiểm ngoại quan kiện hàng khi nhận và hỗ trợ đổi trả miễn phí
                    trong vòng 14 ngày nếu sản phẩm có lỗi từ nhà sản xuất hoặc quá trình vận chuyển.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RELATED SKINCARE ROUTINE SHELF */}
        {relatedProducts.length > 0 && (
          <div className="mt-16">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-7">
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-lumiere-700">
                  Complete Your Routine
                </span>
                <h2 className="mt-1.5 font-serif text-2xl sm:text-3xl font-bold text-stone-950">
                  Sản Phẩm Tương Tự Cùng Chu Trình Dưỡng Da
                </h2>
              </div>
              <Link
                to={`/products?category_id=${product.category_id}`}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-lumiere-800 hover:text-lumiere-600 transition-colors"
              >
                <span>Xem thêm {product.category_name}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((rel) => (
                <ProductCard key={rel.id} product={rel} />
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default ProductDetailPage;
