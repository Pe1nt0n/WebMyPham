import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  Crown,
  Droplets,
  Flower2,
  Globe2,
  Leaf,
  Palette,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Sun,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getApiErrorMessage, isCanceledRequest, publicApi } from '../../api/clients';
import { ProductCard } from '../../components/customer/ProductCard';
import { PRICE_PRESETS } from '../../components/customer/ProductFilterSidebar';
import { SKIN_TYPES } from '../../utils/format';

const CATEGORY_VISUALS = {
  skincare: {
    image:
      'https://images.unsplash.com/photo-1617897903246-719242758050?auto=format&fit=crop&w=900&q=85',
    subtitle: 'Tinh chất, tẩy trang & phục hồi chuyên sâu',
    icon: Droplets,
  },
  makeup: {
    image:
      'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=900&q=85',
    subtitle: 'Son kem nhung lì, phấn nước & kem nền lâu trôi',
    icon: Palette,
  },
  sunscreen: {
    image:
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=900&q=85',
    subtitle: 'Màng lọc quang phổ rộng SPF50+ PA++++',
    icon: Sun,
  },
  fragrance: {
    image:
      'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=900&q=85',
    subtitle: 'Eau de Parfum & Eau de Toilette kinh điển',
    icon: Flower2,
  },
  body: {
    image:
      'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=900&q=85',
    subtitle: 'Chăm sóc cơ thể & nuôi dưỡng mái tóc thuần chay',
    icon: Leaf,
  },
};

function resolveCategoryVisual(name = '') {
  const lower = String(name).toLowerCase();
  if (lower.includes('nắng')) return CATEGORY_VISUALS.sunscreen;
  if (lower.includes('trang điểm') || lower.includes('son')) return CATEGORY_VISUALS.makeup;
  if (lower.includes('hoa') || lower.includes('hương')) return CATEGORY_VISUALS.fragrance;
  if (lower.includes('cơ thể') || lower.includes('tóc')) return CATEGORY_VISUALS.body;
  return CATEGORY_VISUALS.skincare;
}

const TRUST_COMMITMENTS = [
  {
    icon: ShieldCheck,
    title: '100% Mỹ Phẩm Chính Ngạch',
    desc: 'Nhập khẩu trực tiếp, đầy đủ tem phụ tiếng Việt & hóa đơn',
  },
  {
    icon: Clock,
    title: 'Giao Nhanh Nội Thành 2 Giờ',
    desc: 'Đóng gói chống sốc tiêu chuẩn Boutique toàn quốc',
  },
  {
    icon: RotateCcw,
    title: 'Đổi Trả Miễn Phí 14 Ngày',
    desc: 'Hỗ trợ tận tâm cho làn da kích ứng hoặc lỗi vận chuyển',
  },
  {
    icon: Stethoscope,
    title: 'Dược Sĩ Tư Vấn Da 1:1',
    desc: 'Thiết kế chu trình cá nhân hóa theo từng tình trạng da',
  },
];

const MERCHANDISING_TABS = [
  { id: 'all', label: 'Tất Cả Nổi Bật' },
  { id: 'skincare', label: 'Chăm Sóc Da' },
  { id: 'makeup', label: 'Trang Điểm & Son' },
  { id: 'sunscreen', label: 'Chống Nắng Bảo Vệ' },
  { id: 'under400k', label: 'Giá Tốt Dưới 400K' },
];

export function HomePage() {
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadTick, setReloadTick] = useState(0);

  // Hero Campaign Slider state
  const [activeSlide, setActiveSlide] = useState(0);
  const [sliderPaused, setSliderPaused] = useState(false);

  // Interactive Merchandising Shelf tab
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');

    Promise.all([
      publicApi.get('/categories', { signal: controller.signal }),
      publicApi.get('/brands', { signal: controller.signal }),
      publicApi.get('/products', {
        params: { sort: 'newest' },
        signal: controller.signal,
      }),
    ])
      .then(([catRes, brandRes, prodRes]) => {
        setCategories(Array.isArray(catRes.data?.data) ? catRes.data.data : []);
        setBrands(Array.isArray(brandRes.data?.data) ? brandRes.data.data : []);
        setAllProducts(Array.isArray(prodRes.data?.data) ? prodRes.data.data : []);
      })
      .catch((err) => {
        if (isCanceledRequest(err)) return;
        setError(
          getApiErrorMessage(err, 'Không thể tải bộ sưu tập mỹ phẩm lúc này. Vui lòng thử lại.')
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [reloadTick]);

  // Tra cứu ID danh mục động từ API để mọi liên kết chiến dịch khớp chính xác
  const categoryLinks = useMemo(() => {
    const findCatId = (keyword) => {
      const found = categories.find((c) =>
        String(c.name || '')
          .toLowerCase()
          .includes(keyword)
      );
      return found ? String(found.id) : '';
    };

    const skincareId = findCatId('da');
    const makeupId = findCatId('trang điểm');
    const sunscreenId = findCatId('nắng');
    const fragranceId = findCatId('hoa');
    const bodyId = findCatId('cơ thể');

    return {
      skincare: skincareId ? `/products?category_id=${skincareId}` : '/products?search=Tinh+chất',
      makeup: makeupId ? `/products?category_id=${makeupId}` : '/products?search=Son',
      sunscreen: sunscreenId
        ? `/products?category_id=${sunscreenId}`
        : '/products?search=Chống+nắng',
      fragrance: fragranceId ? `/products?category_id=${fragranceId}` : '/products?search=Nước+hoa',
      body: bodyId ? `/products?category_id=${bodyId}` : '/products?search=Cocoon',
    };
  }, [categories]);

  // 3 Slide Chiến dịch Flagship (Sephora / Olive Young / Lancôme Editorial)
  const heroSlides = useMemo(
    () => [
      {
        id: 'derma-skincare',
        eyebrow: 'DERMATOLOGICAL SKINCARE • PARIS & NEW YORK',
        title: 'Làn Da Căng Bóng Chuẩn Dược Mỹ Phẩm Pháp',
        description:
          "Đánh thức sức sống làn da từ cấp độ tế bào với hệ hoạt chất tinh khiết từ La Roche-Posay, Paula's Choice và The Ordinary — phục hồi màng ẩm tự nhiên và bảo vệ da tối ưu mỗi ngày.",
        brands: ['La Roche-Posay', "Paula's Choice", 'The Ordinary'],
        ctaLabel: 'Khám phá Chăm sóc da',
        ctaTo: categoryLinks.skincare,
        secondaryLabel: 'Dành cho da nhạy cảm',
        secondaryTo: `/products?skin_type=${encodeURIComponent('Da nhạy cảm')}`,
        image:
          'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=1400&q=85',
        spotlightTag: 'Bestseller Khoa Học Làn Da',
        spotlightTitle: 'Anthelios UVMune 400 & BHA 2% Liquid',
        spotlightDesc: 'Giải pháp kiềm dầu 12h & thu nhỏ lỗ chân lông chuyên sâu',
        bgClass: 'from-stone-950 via-lumiere-950 to-stone-900',
        accentPill: 'bg-champagne-300/15 text-champagne-200 border-champagne-300/30',
      },
      {
        id: 'kbeauty-makeup',
        eyebrow: 'SEOUL MAKEUP ATELIER • K-BEAUTY COLLECTION',
        title: 'Sắc Môi Nhung Lì & Lớp Nền Trong Veo',
        description:
          'Tôn vinh đường nét thanh tú tự nhiên cùng bảng màu son kem mịn mượt 3CE, phấn nước kiềm dầu 24 giờ Laneige Neo Cushion và tinh chất trà xanh đảo Jeju Innisfree.',
        brands: ['3CE Stylenanda', 'Laneige', 'Innisfree'],
        ctaLabel: 'Mua sắm Trang điểm',
        ctaTo: categoryLinks.makeup,
        secondaryLabel: 'Khám phá K-Beauty',
        secondaryTo: '/products?sort=newest',
        image:
          'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1400&q=85',
        spotlightTag: 'Xu Hướng Trang Điểm 2026',
        spotlightTitle: '3CE Velvet Lip Tint & Neo Cushion Matte',
        spotlightDesc: 'Lớp nền mỏng nhẹ tựa sương mai, bền màu không xuống tông',
        bgClass: 'from-lumiere-950 via-stone-950 to-lumiere-900',
        accentPill: 'bg-rose-300/15 text-rose-200 border-rose-300/30',
      },
      {
        id: 'haute-parfumerie',
        eyebrow: 'HAUTE PARFUMERIE & BOTANICAL RITUAL',
        title: 'Dấu Ấn Hương Thơm Thanh Khiết',
        description:
          'Đắm chìm trong nghệ thuật chế tác hương hoa Pháp quyến rũ từ nhà mốt Dior kết hợp liệu trình chăm sóc cơ thể và mái tóc thuần chay lành tính từ Cocoon Việt Nam.',
        brands: ['Dior Parfums', 'Cocoon Vietnam'],
        ctaLabel: 'Khám phá Nước hoa',
        ctaTo: categoryLinks.fragrance,
        secondaryLabel: 'Chăm sóc cơ thể & tóc',
        secondaryTo: categoryLinks.body,
        image:
          'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1400&q=85',
        spotlightTag: 'Tuyệt Tác Hương Hoa Pháp',
        spotlightTitle: "Miss Dior Blooming Bouquet & J'adore EDP",
        spotlightDesc: 'Nốt hương hoa mẫu đơn, hồng Damask & xạ hương trắng tinh khôi',
        bgClass: 'from-stone-950 via-stone-900 to-champagne-900',
        accentPill: 'bg-amber-200/15 text-champagne-200 border-champagne-300/30',
      },
    ],
    [categoryLinks]
  );

  // Tự động chuyển slide mỗi 5.5 giây
  useEffect(() => {
    if (sliderPaused || heroSlides.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5500);
    return () => window.clearInterval(timer);
  }, [sliderPaused, heroSlides.length]);

  const handlePrevSlide = useCallback(() => {
    setActiveSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  }, [heroSlides.length]);

  const handleNextSlide = useCallback(() => {
    setActiveSlide((prev) => (prev + 1) % heroSlides.length);
  }, [heroSlides.length]);

  // Lọc danh sách sản phẩm trực tiếp trên kệ hàng theo Tab
  const displayedProducts = useMemo(() => {
    let filtered = allProducts;

    if (activeTab === 'skincare') {
      filtered = allProducts.filter((p) => {
        const cat = String(p.category_name || '').toLowerCase();
        return cat.includes('chăm sóc da') || cat === 'da';
      });
    } else if (activeTab === 'makeup') {
      filtered = allProducts.filter((p) => {
        const cat = String(p.category_name || '').toLowerCase();
        const name = String(p.name || '').toLowerCase();
        return cat.includes('trang điểm') || name.includes('son') || name.includes('phấn');
      });
    } else if (activeTab === 'sunscreen') {
      filtered = allProducts.filter((p) => {
        const cat = String(p.category_name || '').toLowerCase();
        const name = String(p.name || '').toLowerCase();
        return cat.includes('nắng') || name.includes('chống nắng') || name.includes('spf');
      });
    } else if (activeTab === 'under400k') {
      filtered = allProducts.filter((p) => Number(p.price ?? 0) > 0 && Number(p.price) <= 400000);
    }

    return filtered.slice(0, 8);
  }, [allProducts, activeTab]);

  const activeTabMoreLink = useMemo(() => {
    if (activeTab === 'skincare') return categoryLinks.skincare;
    if (activeTab === 'makeup') return categoryLinks.makeup;
    if (activeTab === 'sunscreen') return categoryLinks.sunscreen;
    if (activeTab === 'under400k') return '/products?max_price=400000';
    return '/products';
  }, [activeTab, categoryLinks]);

  // Cẩm nang 4 bước dưỡng da chuẩn chuyên gia
  const skincareSteps = useMemo(
    () => [
      {
        step: '01',
        phase: 'BƯỚC 1 • CLEANSE',
        title: 'Làm Sạch Sâu Dịu Nhẹ',
        desc: 'Cuốn trôi lớp kem chống nắng, trang điểm và bụi mịn PM2.5 mà vẫn giữ trọn độ pH cân bằng cho da.',
        highlight: 'Nước tẩy trang Micellar & Tẩy tế bào chết',
        to: `/products?search=${encodeURIComponent('Tẩy')}`,
      },
      {
        step: '02',
        phase: 'BƯỚC 2 • TREAT',
        title: 'Cân Bằng & Đặc Trị',
        desc: 'Bổ sung hoạt chất BHA 2%, Niacinamide hoặc Hyaluronic Acid giải quyết chuyên sâu mụn ẩn, lỗ chân lông và thâm sạm.',
        highlight: 'Serum & Dung dịch đặc trị chuyên biệt',
        to: `/products?search=${encodeURIComponent('Tinh chất')}`,
      },
      {
        step: '03',
        phase: 'BƯỚC 3 • MOISTURIZE',
        title: 'Dưỡng Ẩm Phục Hồi',
        desc: 'Củng cố hàng rào lipid tự nhiên, khóa ẩm đa tầng suốt đêm cho bề mặt da căng mịn và đàn hồi rạng rỡ.',
        highlight: 'Dưỡng ẩm sâu & Mặt nạ ngủ phục hồi',
        to: categoryLinks.skincare,
      },
      {
        step: '04',
        phase: 'BƯỚC 4 • PROTECT',
        title: 'Bảo Vệ Phổ Rộng SPF50+',
        desc: 'Che chắn làn da toàn diện trước tia UVA/UVB bước sóng dài — chìa khóa vàng ngăn ngừa lão hóa sớm.',
        highlight: 'Sữa & Gel chống nắng kiềm dầu thoáng nhẹ',
        to: categoryLinks.sunscreen,
      },
    ],
    [categoryLinks]
  );

  const currentSlide = heroSlides[activeSlide] || heroSlides[0];

  return (
    <div className="space-y-16 sm:space-y-20 pb-20">
      {/* 1. INTERACTIVE HERO CAMPAIGN SLIDER */}
      <section
        aria-label="Chiến dịch nổi bật Lumière Beauté"
        onMouseEnter={() => setSliderPaused(true)}
        onMouseLeave={() => setSliderPaused(false)}
        className={`relative overflow-hidden bg-gradient-to-br ${currentSlide.bgClass} text-white transition-colors duration-700`}
      >
        {/* Ambient Editorial Lighting */}
        <div className="pointer-events-none absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-lumiere-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 right-10 h-96 w-96 rounded-full bg-champagne-400/15 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Campaign Copy */}
            <div key={currentSlide.id} className="lg:col-span-7 space-y-6 animate-fade-in">
              <div
                className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] backdrop-blur-sm ${currentSlide.accentPill}`}
              >
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                <span>{currentSlide.eyebrow}</span>
              </div>

              <h1 className="font-serif text-3xl sm:text-5xl lg:text-[3.35rem] font-bold leading-[1.12] tracking-tight text-white">
                {currentSlide.title}
              </h1>

              <p className="max-w-xl text-sm sm:text-base lg:text-lg leading-relaxed text-stone-300">
                {currentSlide.description}
              </p>

              {/* Featured Houses / Brands in Slide */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-stone-400 mr-1">
                  Tâm điểm:
                </span>
                {currentSlide.brands.map((brandLabel) => (
                  <span
                    key={brandLabel}
                    className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-champagne-100"
                  >
                    {brandLabel}
                  </span>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <Link
                  to={currentSlide.ctaTo}
                  className="inline-flex items-center gap-2.5 rounded-full bg-white px-7 py-3.5 text-sm font-bold text-stone-950 shadow-xl shadow-black/25 hover:bg-champagne-100 transition-all"
                >
                  <span>{currentSlide.ctaLabel}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  to={currentSlide.secondaryTo}
                  className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/15 transition-all"
                >
                  <span>{currentSlide.secondaryLabel}</span>
                </Link>
              </div>
            </div>

            {/* Right Editorial Visual Frame */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-stone-900/70 p-3 shadow-2xl shadow-black/40 backdrop-blur-md">
                  <div className="relative aspect-[4/4.4] overflow-hidden rounded-2xl bg-gradient-to-br from-lumiere-900 via-stone-900 to-champagne-900">
                    <img
                      key={currentSlide.image}
                      src={currentSlide.image}
                      alt={currentSlide.title}
                      className="h-full w-full object-cover transition-transform duration-1000 scale-100 hover:scale-105 animate-fade-in"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/20 to-transparent" />

                    {/* Top Floating Badge */}
                    <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-stone-950/75 px-3 py-1 text-[11px] font-semibold tracking-wide text-champagne-200 backdrop-blur-md border border-white/10">
                      <Crown className="h-3.5 w-3.5 text-champagne-300" />
                      <span>{currentSlide.spotlightTag}</span>
                    </div>

                    {/* Bottom Editorial Caption Card */}
                    <Link
                      to={currentSlide.ctaTo}
                      className="group absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3 rounded-2xl border border-white/15 bg-stone-950/80 p-4 backdrop-blur-md transition-colors hover:bg-stone-950/95"
                    >
                      <div className="min-w-0">
                        <p className="font-serif text-base font-bold text-white truncate">
                          {currentSlide.spotlightTitle}
                        </p>
                        <p className="mt-0.5 text-xs text-stone-300 line-clamp-1">
                          {currentSlide.spotlightDesc}
                        </p>
                      </div>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-stone-950 transition-transform group-hover:translate-x-0.5">
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Slider Navigation Bar: Numbered Dots + Arrows */}
          <div className="mt-10 flex items-center justify-between border-t border-white/10 pt-5">
            <div className="flex items-center gap-2.5" role="tablist" aria-label="Chọn slide chiến dịch">
              {heroSlides.map((slide, index) => {
                const isActive = index === activeSlide;
                return (
                  <button
                    key={slide.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-label={`Chuyển đến chiến dịch ${index + 1}: ${slide.title}`}
                    onClick={() => setActiveSlide(index)}
                    className={`group flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-white text-stone-950 shadow-sm'
                        : 'bg-white/10 text-stone-300 hover:bg-white/20 hover:text-white'
                    }`}
                  >
                    <span>0{index + 1}</span>
                    {isActive && (
                      <span className="hidden sm:inline max-w-[150px] truncate font-medium">
                        • {slide.ctaLabel.replace('Khám phá ', '').replace('Mua sắm ', '')}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevSlide}
                aria-label="Chiến dịch trước"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white hover:bg-white hover:text-stone-950 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleNextSlide}
                aria-label="Chiến dịch tiếp theo"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white hover:bg-white hover:text-stone-950 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 2. BRAND TRUST BAR (4 CAM KẾT THƯƠNG HIỆU) */}
        <div className="border-t border-white/10 bg-stone-950/70 backdrop-blur-md">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {TRUST_COMMITMENTS.map((item) => {
                const IconComp = item.icon;
                return (
                  <div key={item.title} className="flex items-start gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-champagne-200/10 text-champagne-300 ring-1 ring-champagne-300/20">
                      <IconComp className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-white">{item.title}</p>
                      <p className="mt-0.5 text-xs text-stone-400 leading-snug">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 3. VISUAL CATEGORY CARDS (DANH MỤC BẰNG THẺ ẢNH NGHỆ THUẬT) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-lumiere-700">
              Luxury Beauty Universes
            </span>
            <h2 className="mt-1.5 font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-stone-950">
              Khám Phá Vũ Trụ Làm Đẹp
            </h2>
          </div>
          <Link
            to="/products"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-lumiere-800 hover:text-lumiere-600 transition-colors"
          >
            <span>Xem toàn bộ danh mục</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {categories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5">
            {categories.map((cat) => {
              const visual = resolveCategoryVisual(cat.name);
              const IconComp = visual.icon;
              return (
                <Link
                  key={cat.id}
                  to={`/products?category_id=${cat.id}`}
                  className="group relative aspect-[4/5] sm:aspect-[3.8/5] overflow-hidden rounded-3xl bg-stone-900 shadow-md transition-all duration-500 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-stone-950/15"
                >
                  <img
                    src={visual.image}
                    alt={cat.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />

                  {/* Luxury Dark-to-Warm Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/35 to-stone-950/10 transition-opacity group-hover:from-lumiere-950/90" />

                  {/* Top Row: Icon + Product Count */}
                  <div className="absolute inset-x-4 top-4 flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur-md ring-1 ring-white/20">
                      <IconComp className="h-4 w-4" />
                    </span>
                    <span className="rounded-full bg-stone-950/65 px-3 py-1 text-[11px] font-semibold text-champagne-100 backdrop-blur-md ring-1 ring-white/15">
                      {cat.product_count ?? 0} sản phẩm
                    </span>
                  </div>

                  {/* Bottom Editorial Title */}
                  <div className="absolute inset-x-4 bottom-4 space-y-1.5 text-white">
                    <h3 className="font-serif text-xl font-bold leading-snug tracking-tight">
                      {cat.name}
                    </h3>
                    <p className="line-clamp-2 text-xs leading-relaxed text-stone-200/90">
                      {cat.description || visual.subtitle}
                    </p>
                    <div className="pt-1.5 inline-flex items-center gap-1.5 text-xs font-bold text-champagne-200 group-hover:text-white transition-colors">
                      <span>Khám phá ngay</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5">
            {[1, 2, 3, 4, 5].map((n) => (
              <div
                key={n}
                className="aspect-[4/5] rounded-3xl bg-white border border-lumiere-100 animate-pulse"
              />
            ))}
          </div>
        ) : null}

        {/* Quick Skin-Type Discovery Strip */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-champagne-200/80 bg-white px-5 py-3.5 shadow-sm">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-stone-700">
            <Sparkles className="h-4 w-4 text-lumiere-600 shrink-0" />
            <span>Tìm nhanh theo tình trạng làn da của bạn:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {SKIN_TYPES.map((skin) => (
              <Link
                key={skin}
                to={`/products?skin_type=${encodeURIComponent(skin)}`}
                className="rounded-full border border-lumiere-100 bg-champagne-50/70 px-3.5 py-1.5 text-xs font-semibold text-stone-800 hover:border-lumiere-600 hover:bg-lumiere-700 hover:text-white transition-all"
              >
                {skin}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 4. INTERACTIVE MERCHANDISING TABS (KỆ HÀNG TUYỂN CHỌN CÓ TAB CHUYỂN ĐỔI) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 mb-7">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-lumiere-700">
              Curated Bestsellers
            </span>
            <h2 className="mt-1.5 font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-stone-950">
              Kệ Hàng Tuyển Chọn Tại Lumière
            </h2>
          </div>

          {/* Interactive Tabs */}
          <div
            role="tablist"
            aria-label="Lọc nhanh kệ hàng nổi bật"
            className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-lumiere-100 bg-white p-1.5 shadow-sm"
          >
            {MERCHANDISING_TABS.map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all ${
                    isSelected
                      ? 'bg-stone-950 text-white shadow-sm'
                      : 'text-stone-600 hover:bg-champagne-50 hover:text-stone-950'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50/70 p-10 text-center">
            <p className="text-sm font-semibold text-rose-700">{error}</p>
            <button
              type="button"
              onClick={() => setReloadTick((prev) => prev + 1)}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-rose-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-rose-700 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Tải lại kệ hàng</span>
            </button>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div
                key={n}
                className="overflow-hidden rounded-2xl border border-lumiere-100 bg-white p-4 space-y-3 animate-pulse"
              >
                <div className="aspect-square rounded-xl bg-lumiere-50" />
                <div className="h-3 w-1/2 rounded bg-slate-100" />
                <div className="h-4 w-full rounded bg-slate-100" />
                <div className="h-4 w-2/3 rounded bg-slate-100" />
                <div className="h-10 w-full rounded-xl bg-lumiere-50" />
              </div>
            ))}
          </div>
        ) : displayedProducts.length === 0 ? (
          <div className="rounded-3xl border border-lumiere-100 bg-white p-12 text-center shadow-sm">
            <p className="font-serif text-lg font-bold text-stone-900">
              Bộ sưu tập này đang được cập nhật thêm sản phẩm mới
            </p>
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-lumiere-700 px-5 py-2.5 text-xs font-semibold text-white hover:bg-lumiere-800"
            >
              <span>Xem tất cả sản phẩm nổi bật</span>
            </button>
          </div>
        ) : (
          <>
            <div
              key={activeTab}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in"
            >
              {displayedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            <div className="mt-9 text-center">
              <Link
                to={activeTabMoreLink}
                className="inline-flex items-center gap-2.5 rounded-full border border-stone-300 bg-white px-7 py-3 text-sm font-bold text-stone-900 shadow-sm hover:border-stone-950 hover:bg-stone-950 hover:text-white transition-all"
              >
                <span>Khám phá trọn bộ sưu tập</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </>
        )}
      </section>

      {/* 5. DUAL PROMOTIONAL LOOKBOOK BANNERS (BANNER ĐÔI CHIẾN DỊCH) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Campaign Banner 1: Oily & Sensitive Skin */}
          <Link
            to={`/products?skin_type=${encodeURIComponent('Da dầu mụn')}`}
            className="group relative min-h-[300px] sm:min-h-[320px] overflow-hidden rounded-3xl bg-stone-950 p-7 sm:p-9 flex flex-col justify-between shadow-lg"
          >
            <img
              src="https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&w=1100&q=85"
              alt="Routine Cho Da Dầu Mụn & Nhạy Cảm"
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover opacity-55 transition-transform duration-700 group-hover:scale-105"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-stone-950/90 via-stone-950/65 to-stone-950/20" />

            <div className="relative max-w-md space-y-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-emerald-200 ring-1 ring-emerald-300/30">
                <Droplets className="h-3.5 w-3.5" />
                <span>Clinical Clarifying Edit</span>
              </span>
              <h3 className="font-serif text-2xl sm:text-3xl font-bold leading-tight text-white">
                Routine Cho Da Dầu Mụn &amp; Nhạy Cảm
              </h3>
              <p className="text-xs sm:text-sm leading-relaxed text-stone-200/90">
                Làm thoáng lỗ chân lông, làm dịu nốt mẩn đỏ và kiểm soát dầu thừa suốt 12 giờ cùng bộ
                đôi Salicylic Acid 2% &amp; Niacinamide tinh khiết.
              </p>
            </div>

            <div className="relative pt-6">
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs sm:text-sm font-bold text-stone-950 shadow-md group-hover:bg-champagne-100 transition-colors">
                <span>Xem phác đồ gợi ý</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </Link>

          {/* Campaign Banner 2: Summer UV Wardrobe */}
          <Link
            to={categoryLinks.sunscreen}
            className="group relative min-h-[300px] sm:min-h-[320px] overflow-hidden rounded-3xl bg-lumiere-950 p-7 sm:p-9 flex flex-col justify-between shadow-lg"
          >
            <img
              src="https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?auto=format&fit=crop&w=1100&q=85"
              alt="Tủ Đồ Chống Nắng UV Mùa Hè"
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover opacity-55 transition-transform duration-700 group-hover:scale-105"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-lumiere-950/90 via-lumiere-950/65 to-stone-950/25" />

            <div className="relative max-w-md space-y-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-300/15 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-champagne-200 ring-1 ring-champagne-300/30">
                <Sun className="h-3.5 w-3.5" />
                <span>SPF50+ PA++++ Defense</span>
              </span>
              <h3 className="font-serif text-2xl sm:text-3xl font-bold leading-tight text-white">
                Tủ Đồ Chống Nắng UV Mùa Hè
              </h3>
              <p className="text-xs sm:text-sm leading-relaxed text-champagne-100/90">
                Màng lọc thế hệ mới Mexoryl 400 &amp; Auto Booster kháng nước mồ hôi, ráo mịn tức thì
                không để lại vệt trắng dưới lớp trang điểm.
              </p>
            </div>

            <div className="relative pt-6">
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs sm:text-sm font-bold text-stone-950 shadow-md group-hover:bg-champagne-100 transition-colors">
                <span>Chọn kem chống nắng ngay</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* 6. 4-STEP SKINCARE ROUTINE GUIDE (CẨM NANG CHU TRÌNH DƯỠNG DA 4 BƯỚC) */}
      <section className="bg-gradient-to-b from-champagne-50/90 via-white to-lumiere-50/40 border-y border-champagne-200/70 py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-lumiere-700">
              Lumière Beauty Ritual
            </span>
            <h2 className="mt-2 font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-stone-950">
              Chu Trình Dưỡng Da Khoa Học 4 Bước
            </h2>
            <p className="mt-2.5 text-sm sm:text-base text-stone-600">
              Xây dựng nền tảng làn da khỏe mạnh bền vững với thứ tự chăm sóc chuẩn da liễu — chạm vào
              từng bước để khám phá sản phẩm phù hợp.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {skincareSteps.map((item) => (
              <Link
                key={item.step}
                to={item.to}
                className="group relative flex flex-col justify-between rounded-3xl border border-champagne-200/90 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-lumiere-400 hover:shadow-xl hover:shadow-lumiere-950/[0.06]"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-lumiere-700">
                      {item.phase}
                    </span>
                    <span className="font-serif text-3xl font-bold text-champagne-300 group-hover:text-lumiere-600 transition-colors">
                      {item.step}
                    </span>
                  </div>

                  <h3 className="font-serif text-xl font-bold text-stone-900 group-hover:text-lumiere-800 transition-colors">
                    {item.title}
                  </h3>

                  <p className="mt-2 text-xs sm:text-sm leading-relaxed text-stone-600">
                    {item.desc}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-champagne-100 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-stone-800 truncate">
                    {item.highlight}
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-lumiere-700 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>

          {/* Smart Budget Selector Strip */}
          <div className="mt-8 rounded-2xl border border-lumiere-100 bg-white p-5 sm:px-7 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-champagne-700">
                Mua sắm thông minh theo ngân sách
              </p>
              <p className="font-serif text-lg font-bold text-stone-900 mt-0.5">
                Lọc nhanh mỹ phẩm theo mức giá yêu thích của bạn
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {PRICE_PRESETS.filter((p) => p.id !== 'all').map((preset) => {
                const params = new URLSearchParams();
                if (preset.min) params.set('min_price', preset.min);
                if (preset.max) params.set('max_price', preset.max);
                return (
                  <Link
                    key={preset.id}
                    to={`/products?${params.toString()}`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50/70 px-4 py-2 text-xs sm:text-sm font-semibold text-stone-800 hover:border-stone-950 hover:bg-stone-950 hover:text-white transition-all"
                  >
                    <span>{preset.label}</span>
                    <ArrowRight className="h-3.5 w-3.5 opacity-70" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 7. OFFICIAL BRAND MALL (KHÔNG GIAN THƯƠNG HIỆU CHÍNH HÃNG) */}
      {brands.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.22em] text-champagne-700">
                <BadgeCheck className="h-4 w-4 text-lumiere-700" />
                <span>Official Brand Mall</span>
              </div>
              <h2 className="mt-1.5 font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-stone-950">
                Gian Hàng Thương Hiệu Chính Hãng
              </h2>
            </div>

            <Link
              to="/products"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-lumiere-800 hover:text-lumiere-600 transition-colors"
            >
              <span>Xem tất cả thương hiệu</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {brands.map((brand) => (
              <Link
                key={brand.id}
                to={`/products?brand_id=${brand.id}`}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-stone-200/90 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-stone-900 hover:shadow-lg"
              >
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="inline-flex items-center gap-1 font-medium text-stone-500">
                    <Globe2 className="h-3 w-3 text-champagne-600" />
                    <span>{brand.origin || 'Quốc tế'}</span>
                  </span>
                  <span className="rounded-full bg-champagne-100/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-champagne-900">
                    Official
                  </span>
                </div>

                <div className="my-4">
                  <p className="font-serif text-lg sm:text-xl font-bold tracking-tight text-stone-950 group-hover:text-lumiere-700 transition-colors truncate">
                    {brand.name}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-stone-100 pt-3 text-xs">
                  <span className="font-medium text-stone-500">
                    {brand.product_count ?? 0} sản phẩm
                  </span>
                  <span className="inline-flex items-center gap-1 font-semibold text-stone-900 group-hover:text-lumiere-700">
                    <span>Cửa hàng</span>
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 8. LUMIÈRE BEAUTY CLUB INVITATION */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-stone-950 px-6 py-10 sm:px-12 sm:py-14 text-white shadow-2xl">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-lumiere-600/25 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 -bottom-20 h-64 w-64 rounded-full bg-champagne-400/15 blur-3xl" />

          <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="max-w-2xl space-y-3.5">
              <div className="inline-flex items-center gap-2 rounded-full border border-champagne-300/30 bg-champagne-300/10 px-3.5 py-1 text-xs font-semibold text-champagne-200">
                <Crown className="h-3.5 w-3.5 text-champagne-300" />
                <span>LUMIÈRE BEAUTY CLUB • ĐẶC QUYỀN THÀNH VIÊN</span>
              </div>
              <h3 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight">
                Nâng Tầm Trải Nghiệm Làm Đẹp Cá Nhân Hóa
              </h3>
              <p className="text-sm sm:text-base leading-relaxed text-stone-300">
                Đăng ký thành viên miễn phí để lưu sổ địa chỉ nhận hàng nhanh, nhận sample dưỡng da
                Pháp - Hàn theo mọi đơn đặt mua và tra cứu hóa đơn điện tử trực tuyến mọi lúc.
              </p>
            </div>

            <div className="flex flex-wrap gap-3.5 shrink-0">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-bold text-stone-950 shadow-lg hover:bg-champagne-100 transition-colors"
              >
                <span>Gia nhập Beauty Club</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/products"
                className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white hover:bg-white/15 transition-colors"
              >
                <span>Khám phá Cửa hàng</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
