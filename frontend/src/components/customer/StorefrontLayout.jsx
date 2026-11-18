import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Clock,
  CreditCard,
  Flame,
  Gift,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Package,
  Phone,
  Search,
  Send,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Truck,
  User,
  X,
} from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { isCanceledRequest, publicApi } from '../../api/clients';
import { useCart } from '../../contexts/CartContext';
import { useCustomerAuth } from '../../contexts/PortalAuthContext';
import { useToast } from '../../contexts/ToastContext';
import { formatCurrency } from '../../utils/format';
import { CartDrawer, OPEN_CART_DRAWER_EVENT } from './CartDrawer';
import { OPEN_QUICK_VIEW_EVENT, ProductQuickViewModal } from './ProductQuickViewModal';

const DEFAULT_CATEGORIES = [
  { id: 1, name: 'Chăm sóc da' },
  { id: 2, name: 'Trang điểm' },
  { id: 3, name: 'Chống nắng' },
  { id: 4, name: 'Nước hoa' },
  { id: 5, name: 'Chăm sóc cơ thể & tóc' },
];

const TRENDING_KEYWORDS = [
  'Kem chống nắng La Roche-Posay',
  'Son kem 3CE',
  'Tẩy trang Bí đao Cocoon',
  "Serum BHA Paula's Choice",
  'Nước hoa Miss Dior',
];

const QUICK_SKIN_CONCERNS = ['Da dầu mụn', 'Da nhạy cảm', 'Da khô', 'Da hỗn hợp'];

const POLICY_DETAILS = {
  return14:
    'Chính sách Đổi trả 14 ngày: Hỗ trợ đổi/trả miễn phí trong vòng 14 ngày kể từ ngày nhận hàng đối với sản phẩm nguyên niêm phong hoặc kích ứng có xác nhận da liễu.',
  authentic:
    'Kiểm định Chính ngạch: 100% sản phẩm phân phối tại Lumière Beauté có hóa đơn VAT, chứng từ nhập khẩu và tem phụ Tiếng Việt theo quy định Bộ Y Tế.',
  shipping2h:
    'Giao nhanh 2H & Freeship: Miễn phí vận chuyển toàn quốc cho mọi đơn từ 499.000 ₫; hỗ trợ giao hỏa tốc 2 giờ nội thành TP. Hồ Chí Minh.',
  privacy:
    'Bảo mật Thông tin: Dữ liệu cá nhân và lịch sử mua sắm của thành viên Lumière Beauty Club được mã hóa và bảo vệ nghiêm ngặt.',
};

function getInitials(fullName = '') {
  const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'LB';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function StorefrontLayout({ children }) {
  const { user, isAuthenticated, logout } = useCustomerAuth();
  const { totalItems, totalAmount } = useCart();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [quickSearch, setQuickSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);

  const userMenuRef = useRef(null);
  const searchBoxRef = useRef(null);
  const pathnameRef = useRef(location.pathname);

  useEffect(() => {
    pathnameRef.current = location.pathname;
  }, [location.pathname]);

  // Tải danh mục động từ GET /api/categories cho thanh Category Navigation Bar
  useEffect(() => {
    const controller = new AbortController();
    publicApi
      .get('/categories', { signal: controller.signal })
      .then((res) => {
        const list = Array.isArray(res.data?.data) ? res.data.data : [];
        if (list.length > 0) {
          setCategories(list);
        }
      })
      .catch((err) => {
        if (isCanceledRequest(err)) return;
      });
    return () => controller.abort();
  }, []);

  // Đồng bộ ô tìm kiếm trên Header khi ở trang /products
  useEffect(() => {
    if (location.pathname === '/products') {
      setQuickSearch(searchParams.get('search') || '');
    } else if (!location.pathname.startsWith('/products')) {
      setQuickSearch('');
    }
  }, [location.pathname, searchParams]);

  // Đóng mọi dropdown / drawer khi chuyển route
  useEffect(() => {
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
    setSearchFocused(false);
    setCartDrawerOpen(false);
    setQuickViewProduct(null);
  }, [location.pathname, location.search]);

  // Đóng dropdown tài khoản & gợi ý tìm kiếm khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Lắng nghe custom event mở Mini-Cart & Quick-View toàn trang (chỉ render 1 instance duy nhất)
  useEffect(() => {
    const handleOpenCartDrawer = () => {
      if (pathnameRef.current === '/cart') return;
      setQuickViewProduct(null);
      setCartDrawerOpen(true);
    };

    const handleOpenQuickView = (event) => {
      const targetProduct = event?.detail?.product;
      if (!targetProduct) return;
      setCartDrawerOpen(false);
      setQuickViewProduct(targetProduct);
    };

    window.addEventListener(OPEN_CART_DRAWER_EVENT, handleOpenCartDrawer);
    window.addEventListener(OPEN_QUICK_VIEW_EVENT, handleOpenQuickView);
    return () => {
      window.removeEventListener(OPEN_CART_DRAWER_EVENT, handleOpenCartDrawer);
      window.removeEventListener(OPEN_QUICK_VIEW_EVENT, handleOpenQuickView);
    };
  }, []);

  const closeCartDrawer = useCallback(() => setCartDrawerOpen(false), []);
  const closeQuickView = useCallback(() => setQuickViewProduct(null), []);

  const handleQuickViewAdded = useCallback(() => {
    if (pathnameRef.current !== '/cart') {
      setCartDrawerOpen(true);
    }
  }, []);

  const executeKeywordSearch = (keyword) => {
    const trimmed = String(keyword || '').trim();
    setQuickSearch(trimmed);
    setSearchFocused(false);
    setMobileMenuOpen(false);

    if (!trimmed) {
      navigate('/products');
      return;
    }
    const nextParams = new URLSearchParams();
    nextParams.set('search', trimmed);
    navigate(`/products?${nextParams.toString()}`);
  };

  const handleQuickSearchSubmit = (event) => {
    event.preventDefault();
    executeKeywordSearch(quickSearch);
  };

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
    toast.info('Hẹn gặp lại quý khách tại Lumière Beauté.');
    navigate('/');
  };

  const handleNewsletterSubmit = (event) => {
    event.preventDefault();
    const email = newsletterEmail.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.warning('Vui lòng nhập địa chỉ email hợp lệ để nhận ưu đãi thành viên.');
      return;
    }
    setNewsletterSubscribed(true);
    setNewsletterEmail('');
    toast.success('Chào mừng bạn gia nhập Lumière Beauty Club! Ưu đãi 10% đã được gửi qua email.', {
      title: 'Đăng ký bản tin thành công',
    });
  };

  const showPolicyInfo = (policyKey, title) => {
    const msg = POLICY_DETAILS[policyKey];
    if (msg) {
      toast.info(msg, { title, duration: 5000 });
    }
  };

  const activeCategoryId = location.pathname === '/products' ? searchParams.get('category_id') || '' : '';
  const activeMaxPrice = location.pathname === '/products' ? searchParams.get('max_price') || '' : '';
  const activeSort = location.pathname === '/products' ? searchParams.get('sort') || '' : '';
  const isAllProductsActive =
    location.pathname === '/products' && !activeCategoryId && activeMaxPrice !== '300000' && activeSort !== 'newest';

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFBF9] text-stone-800 selection:bg-lumiere-200 selection:text-lumiere-950">
      {/* 1. Top Promo Bar Thương Mại Thật */}
      <div className="bg-stone-950 text-stone-100 text-[11px] tracking-wide border-b border-stone-900 no-print">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-medium">
            <Sparkles className="h-3.5 w-3.5 text-champagne-300 shrink-0" />
            <span className="truncate sm:whitespace-normal">
              MIỄN PHÍ VẬN CHUYỂN ĐƠN TỪ 499.000₫ • TẶNG SAMPLE CHÍNH HÃNG CHO MỌI ĐƠN HÀNG
            </span>
          </div>

          <div className="hidden md:flex items-center gap-3.5 ml-auto text-stone-300">
            <a
              href="tel:19006886"
              className="inline-flex items-center gap-1.5 hover:text-white transition-colors"
            >
              <Phone className="h-3 w-3 text-champagne-300" />
              <span>Hotline Bác sĩ Da liễu: 1900 6886</span>
            </a>
            <span className="text-stone-700">|</span>
            <Link
              to="/orders"
              className="inline-flex items-center gap-1.5 font-medium text-stone-200 hover:text-white transition-colors"
            >
              <Package className="h-3 w-3 text-champagne-300" />
              <span>Tra cứu đơn hàng</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Header 2 Tầng Chuẩn E-Commerce Cao Cấp (Sephora / Olive Young) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200/80 shadow-sm shadow-stone-950/[0.02] no-print">
        {/* Tầng 1: Main Header Bar */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-[4.5rem] py-3 items-center justify-between gap-3 lg:gap-8">
            {/* Logo Editorial Sang Trọng */}
            <Link to="/" className="group flex flex-col items-start shrink-0 focus:outline-none">
              <span className="font-serif text-2xl sm:text-[26px] font-bold tracking-[0.26em] text-stone-950 leading-none transition-colors group-hover:text-lumiere-800">
                LUMIÈRE
              </span>
              <span className="mt-1 text-[9.5px] font-medium uppercase tracking-[0.34em] text-stone-500">
                PARIS • SAIGON
              </span>
            </Link>

            {/* Thanh Tìm Kiếm Trung Tâm + Dropdown Từ Khóa Xu Hướng */}
            <div ref={searchBoxRef} className="hidden sm:block flex-1 max-w-xl relative">
              <form onSubmit={handleQuickSearchSubmit} className="relative flex items-center">
                <Search className="pointer-events-none absolute left-4 h-4 w-4 text-stone-400" />
                <input
                  type="text"
                  value={quickSearch}
                  onFocus={() => setSearchFocused(true)}
                  onChange={(e) => setQuickSearch(e.target.value)}
                  placeholder="Tìm kiếm kem chống nắng, serum BHA, son 3CE, nước hoa..."
                  aria-label="Tìm kiếm mỹ phẩm chính hãng"
                  className="w-full rounded-full border border-stone-200/90 bg-[#FAF8F5] pl-11 pr-24 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 transition-all focus:border-stone-900 focus:bg-white focus:outline-none focus:ring-4 focus:ring-stone-950/[0.04]"
                />
                {quickSearch && (
                  <button
                    type="button"
                    onClick={() => setQuickSearch('')}
                    aria-label="Xóa từ khóa tìm kiếm"
                    className="absolute right-[4.5rem] p-1 text-stone-400 hover:text-stone-700"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="submit"
                  className="absolute right-1.5 rounded-full bg-stone-950 px-4 py-1.5 text-xs font-semibold tracking-wide text-white transition-colors hover:bg-lumiere-800"
                >
                  Tìm
                </button>
              </form>

              {/* Dropdown gợi ý từ khóa xu hướng */}
              {searchFocused && (
                <div className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-2xl border border-stone-200/90 bg-white p-4 shadow-2xl shadow-stone-950/12 animate-fade-in z-50">
                  <div className="flex items-center justify-between pb-2.5 border-b border-stone-100">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-stone-900">
                      <TrendingUp className="h-3.5 w-3.5 text-lumiere-700" />
                      <span>Từ khóa xu hướng</span>
                    </span>
                    <span className="text-[11px] text-stone-400">Gợi ý tìm kiếm nhanh</span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {TRENDING_KEYWORDS.map((kw) => (
                      <button
                        key={kw}
                        type="button"
                        onClick={() => executeKeywordSearch(kw)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-stone-200/90 bg-[#FAF8F5] px-3 py-1.5 text-xs font-medium text-stone-700 transition-all hover:border-stone-900 hover:bg-stone-950 hover:text-white"
                      >
                        <Flame className="h-3 w-3 text-lumiere-600 shrink-0" />
                        <span>{kw}</span>
                      </button>
                    ))}
                  </div>

                  <div className="mt-3.5 pt-3 border-t border-stone-100 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold text-stone-400">Theo làn da:</span>
                    {QUICK_SKIN_CONCERNS.map((skin) => (
                      <Link
                        key={skin}
                        to={`/products?skin_type=${encodeURIComponent(skin)}`}
                        onClick={() => setSearchFocused(false)}
                        className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-medium text-stone-700 transition-colors hover:bg-lumiere-50 hover:text-lumiere-800"
                      >
                        {skin}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Khu vực phải: Tài khoản thành viên + Nút Giỏ hàng mở CartDrawer + Mobile Menu */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Tài khoản thành viên */}
              {isAuthenticated && user ? (
                <div className="relative hidden sm:block" ref={userMenuRef}>
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen((prev) => !prev)}
                    className="inline-flex items-center gap-2 rounded-full border border-stone-200/90 bg-white pl-1.5 pr-3 py-1.5 text-sm font-medium text-stone-800 transition-all hover:border-stone-400"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-950 text-[11px] font-bold tracking-wider text-white">
                      {getInitials(user.full_name)}
                    </span>
                    <span className="max-w-[120px] truncate text-xs font-semibold text-stone-900">
                      {user.full_name}
                    </span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 text-stone-400 transition-transform ${
                        userMenuOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-64 origin-top-right overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-2xl shadow-stone-950/12 animate-fade-in z-50">
                      <div className="bg-[#FAF8F5] px-4 py-3.5 border-b border-stone-200/80">
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-lumiere-700">
                          Lumière Beauty Club
                        </p>
                        <p className="mt-0.5 text-sm font-bold text-stone-950 truncate">
                          {user.full_name}
                        </p>
                        <p className="text-xs text-stone-500 truncate">
                          {user.email || `@${user.username}`}
                        </p>
                      </div>

                      <div className="p-1.5">
                        <Link
                          to="/profile"
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-stone-700 transition-colors hover:bg-stone-100 hover:text-stone-950"
                        >
                          <User className="h-4 w-4 text-stone-500" />
                          <span>Hồ sơ của tôi</span>
                        </Link>
                        <Link
                          to="/orders"
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-stone-700 transition-colors hover:bg-stone-100 hover:text-stone-950"
                        >
                          <Package className="h-4 w-4 text-stone-500" />
                          <span>Đơn mua của tôi</span>
                        </Link>
                      </div>

                      <div className="border-t border-stone-100 p-1.5">
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50"
                        >
                          <LogOut className="h-4 w-4" />
                          <span>Đăng xuất</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="hidden sm:flex items-center gap-1.5">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold text-stone-700 transition-colors hover:bg-stone-100 hover:text-stone-950"
                  >
                    <User className="h-4 w-4 text-stone-500" />
                    <span>Đăng nhập</span>
                  </Link>
                  <Link
                    to="/register"
                    className="rounded-full border border-stone-950 bg-stone-950 px-4 py-2 text-xs font-semibold text-white transition-colors hover:border-lumiere-800 hover:bg-lumiere-800"
                  >
                    Đăng ký
                  </Link>
                </div>
              )}

              {/* Nút Giỏ hàng mở Mini-Cart trượt bên phải */}
              <button
                type="button"
                onClick={() => setCartDrawerOpen(true)}
                aria-label={`Mở giỏ hàng (${totalItems} sản phẩm)`}
                title={`Giỏ hàng: ${totalItems} sản phẩm (${formatCurrency(totalAmount)})`}
                className="group relative inline-flex items-center gap-2.5 rounded-full border border-stone-200/90 bg-[#FAF8F5] px-3.5 py-2 text-xs font-semibold text-stone-900 transition-all hover:border-stone-900 hover:bg-white"
              >
                <div className="relative">
                  <ShoppingBag className="h-4 w-4 sm:h-[18px] sm:w-[18px] text-stone-900 transition-transform group-hover:scale-105" />
                  <span
                    className={`absolute -top-2 -right-2.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold transition-colors ${
                      totalItems > 0
                        ? 'bg-lumiere-700 text-white'
                        : 'bg-stone-200 text-stone-600'
                    }`}
                  >
                    {totalItems > 99 ? '99+' : totalItems}
                  </span>
                </div>
                <span className="hidden xl:inline pl-1 font-bold text-stone-900">
                  {totalItems > 0 ? formatCurrency(totalAmount) : 'Giỏ hàng'}
                </span>
              </button>

              {/* Nút Menu trên Mobile */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                aria-label="Mở menu điều hướng"
                className="inline-flex lg:hidden items-center justify-center rounded-full border border-stone-200 bg-white p-2 text-stone-800 hover:bg-stone-100"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Tầng 2: Category Navigation Bar trên Desktop */}
        <div className="hidden lg:block border-t border-stone-100 bg-white/95">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <nav
              aria-label="Danh mục mỹ phẩm chính"
              className="flex items-center justify-between gap-4 overflow-x-auto py-2.5 text-[13px]"
            >
              <div className="flex items-center gap-6 xl:gap-7">
                <Link
                  to="/products"
                  className={`whitespace-nowrap font-semibold transition-colors ${
                    isAllProductsActive
                      ? 'text-lumiere-700'
                      : 'text-stone-800 hover:text-lumiere-700'
                  }`}
                >
                  Tất cả sản phẩm
                </Link>

                {categories.map((cat) => {
                  const isCatActive = String(activeCategoryId) === String(cat.id);
                  return (
                    <Link
                      key={cat.id}
                      to={`/products?category_id=${cat.id}`}
                      className={`whitespace-nowrap transition-colors ${
                        isCatActive
                          ? 'font-bold text-lumiere-700'
                          : 'font-medium text-stone-600 hover:text-stone-950'
                      }`}
                    >
                      {cat.name}
                    </Link>
                  );
                })}
              </div>

              <div className="flex items-center gap-5 shrink-0 pl-4 border-l border-stone-200/80">
                <Link
                  to="/products?sort=newest"
                  className={`whitespace-nowrap font-semibold transition-colors ${
                    activeSort === 'newest'
                      ? 'text-lumiere-700'
                      : 'text-stone-700 hover:text-stone-950'
                  }`}
                >
                  Hàng mới về
                </Link>
                <Link
                  to="/products?max_price=300000"
                  className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                    activeMaxPrice === '300000'
                      ? 'bg-lumiere-700 text-white'
                      : 'bg-lumiere-50 text-lumiere-800 hover:bg-lumiere-100'
                  }`}
                >
                  <Gift className="h-3 w-3" />
                  <span>Ưu đãi dưới 300K</span>
                </Link>
              </div>
            </nav>
          </div>
        </div>

        {/* Mobile Menu Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-stone-200/80 bg-white px-4 py-4 space-y-4 animate-fade-in max-h-[82vh] overflow-y-auto">
            {/* Tìm kiếm trên Mobile */}
            <form onSubmit={handleQuickSearchSubmit} className="relative flex items-center">
              <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-stone-400" />
              <input
                type="text"
                aria-label="Tìm kiếm mỹ phẩm trên thiết bị di động"
                value={quickSearch}
                onChange={(e) => setQuickSearch(e.target.value)}
                placeholder="Tìm kem chống nắng, son 3CE, serum..."
                className="w-full rounded-full border border-stone-200 bg-[#FAF8F5] pl-10 pr-20 py-2.5 text-sm text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none"
              />
              <button
                type="submit"
                className="absolute right-1.5 rounded-full bg-stone-950 px-3.5 py-1.5 text-xs font-semibold text-white"
              >
                Tìm
              </button>
            </form>

            {/* Từ khóa xu hướng trên Mobile */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400">
                Xu hướng tìm kiếm
              </p>
              <div className="flex flex-wrap gap-1.5">
                {TRENDING_KEYWORDS.map((kw) => (
                  <button
                    key={kw}
                    type="button"
                    onClick={() => executeKeywordSearch(kw)}
                    className="rounded-full border border-stone-200 bg-[#FAF8F5] px-2.5 py-1 text-[11px] font-medium text-stone-700"
                  >
                    {kw}
                  </button>
                ))}
              </div>
            </div>

            {/* Danh mục sản phẩm trên Mobile */}
            <div className="border-t border-stone-100 pt-3 space-y-1">
              <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400">
                Danh mục mua sắm
              </p>
              <Link
                to="/products"
                className="block rounded-xl px-3 py-2 text-sm font-semibold text-stone-900 hover:bg-stone-50"
              >
                Tất cả sản phẩm
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  to={`/products?category_id=${cat.id}`}
                  className="block rounded-xl px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 hover:text-stone-950"
                >
                  {cat.name}
                </Link>
              ))}
              <Link
                to="/products?sort=newest"
                className="block rounded-xl px-3 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-50"
              >
                Hàng mới về
              </Link>
              <Link
                to="/products?max_price=300000"
                className="flex items-center justify-between rounded-xl bg-lumiere-50/80 px-3 py-2 text-sm font-semibold text-lumiere-800"
              >
                <span>Ưu đãi dưới 300K</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Tiện ích đơn hàng & Tài khoản trên Mobile */}
            <div className="border-t border-stone-100 pt-3 space-y-2.5">
              <div className="flex items-center justify-between px-2 text-xs text-stone-600">
                <a href="tel:19006886" className="inline-flex items-center gap-1.5 font-medium">
                  <Phone className="h-3.5 w-3.5 text-lumiere-700" />
                  <span>Hotline: 1900 6886</span>
                </a>
                <Link to="/orders" className="font-semibold text-stone-900">
                  Tra cứu đơn hàng →
                </Link>
              </div>

              {isAuthenticated && user ? (
                <div className="rounded-2xl border border-stone-200/80 bg-[#FAF8F5] p-3 space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-950 text-xs font-bold text-white">
                      {getInitials(user.full_name)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-stone-950 truncate">{user.full_name}</p>
                      <p className="text-xs text-stone-500 truncate">
                        {user.email || `@${user.username}`}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      to="/profile"
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-800"
                    >
                      <User className="h-3.5 w-3.5" />
                      <span>Hồ sơ của tôi</span>
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/login"
                    className="rounded-xl border border-stone-300 bg-white py-2.5 text-center text-xs font-semibold text-stone-900"
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    to="/register"
                    className="rounded-xl bg-stone-950 py-2.5 text-center text-xs font-semibold text-white"
                  >
                    Đăng ký thành viên
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* 3. Nội dung chính của trang */}
      <main className="flex-1">{children || <Outlet />}</main>

      {/* 4. Dải Cam Kết Dịch Vụ Cao Cấp */}
      <section className="border-t border-stone-200/80 bg-white no-print">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FAF8F5] text-stone-900 border border-stone-200/80">
                <ShieldCheck className="h-5 w-5 stroke-[1.75]" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-950">
                  100% Chính Ngạch
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-stone-500">
                  Đầy đủ tem phụ Tiếng Việt, hóa đơn VAT và chứng nhận phân phối từ thương hiệu.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FAF8F5] text-stone-900 border border-stone-200/80">
                <Truck className="h-5 w-5 stroke-[1.75]" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-950">
                  Freeship Đơn Từ 499K
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-stone-500">
                  Giao nhanh nội thành 2H tại TP.HCM và đồng kiểm nguyên niêm phong toàn quốc.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FAF8F5] text-stone-900 border border-stone-200/80">
                <Gift className="h-5 w-5 stroke-[1.75]" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-950">
                  Sample Chính Hãng
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-stone-500">
                  Tặng kèm bộ mẫu thử dược mỹ phẩm phù hợp tình trạng da cho mọi đơn đặt hàng.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FAF8F5] text-stone-900 border border-stone-200/80">
                <CheckCircle2 className="h-5 w-5 stroke-[1.75]" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-950">
                  Đổi Trả 14 Ngày
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-stone-500">
                  Bảo vệ quyền lợi khách hàng với chính sách đổi trả linh hoạt trong 14 ngày.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Footer 4 Cột Chuẩn Thương Hiệu Mỹ Phẩm Lớn */}
      <footer className="bg-stone-950 text-stone-300 border-t border-stone-900 no-print">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 lg:py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">
            {/* Cột 1: Về Lumière Beauté */}
            <div className="lg:col-span-3 space-y-4">
              <Link to="/" className="inline-block">
                <span className="block font-serif text-2xl font-bold tracking-[0.26em] text-white">
                  LUMIÈRE
                </span>
                <span className="mt-1 block text-[9.5px] font-medium uppercase tracking-[0.34em] text-champagne-300">
                  BEAUTÉ & SKINCARE
                </span>
              </Link>

              <p className="text-xs leading-relaxed text-stone-400">
                Điểm đến mua sắm dược mỹ phẩm khoa học, trang điểm cao cấp và nước hoa chính ngạch từ
                Pháp, Hàn Quốc, Nhật Bản & Bắc Mỹ. Bảo quản kho lạnh tiêu chuẩn 20–24°C suốt 24/7.
              </p>

              <div className="space-y-2 pt-1 text-xs text-stone-300">
                <a
                  href="tel:19006886"
                  className="flex items-center gap-2.5 hover:text-white transition-colors"
                >
                  <Phone className="h-3.5 w-3.5 text-champagne-300 shrink-0" />
                  <span>Hotline Bác sĩ Da liễu: 1900 6886</span>
                </a>
                <a
                  href="mailto:concierge@lumierebeaute.vn"
                  className="flex items-center gap-2.5 hover:text-white transition-colors"
                >
                  <Mail className="h-3.5 w-3.5 text-champagne-300 shrink-0" />
                  <span>concierge@lumierebeaute.vn</span>
                </a>
              </div>
            </div>

            {/* Cột 2: Dịch vụ Khách hàng */}
            <div className="lg:col-span-3 space-y-3.5">
              <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-white">
                Dịch Vụ Khách Hàng
              </h3>
              <ul className="space-y-2.5 text-xs text-stone-400">
                <li>
                  <button
                    type="button"
                    onClick={() => showPolicyInfo('return14', 'Chính sách Đổi trả 14 ngày')}
                    className="text-left hover:text-white transition-colors"
                  >
                    Chính sách đổi trả miễn phí 14 ngày
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => showPolicyInfo('authentic', 'Kiểm định Chính ngạch 100%')}
                    className="text-left hover:text-white transition-colors"
                  >
                    Cam kết kiểm định chính ngạch & Tem phụ
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => showPolicyInfo('shipping2h', 'Vận chuyển & Giao nhanh 2H')}
                    className="text-left hover:text-white transition-colors"
                  >
                    Chính sách Freeship & Giao hỏa tốc 2H
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => showPolicyInfo('privacy', 'Chính sách Bảo mật Thông tin')}
                    className="text-left hover:text-white transition-colors"
                  >
                    Bảo mật thông tin & Quyền riêng tư
                  </button>
                </li>
                <li>
                  <Link to="/orders" className="hover:text-white transition-colors">
                    Tra cứu hành trình đơn hàng
                  </Link>
                </li>
                <li>
                  <Link to="/products" className="hover:text-white transition-colors">
                    Danh mục thương hiệu phân phối
                  </Link>
                </li>
              </ul>
            </div>

            {/* Cột 3: Hệ thống Flagship Showroom */}
            <div className="lg:col-span-3 space-y-3.5">
              <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-white">
                Flagship Showroom
              </h3>
              <ul className="space-y-3.5 text-xs text-stone-400">
                <li className="space-y-1">
                  <p className="font-semibold text-stone-200 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-champagne-300 shrink-0" />
                    <span>Boutique An Dương Vương</span>
                  </p>
                  <p className="pl-5 leading-relaxed">
                    273 An Dương Vương, Phường 3, Quận 5, TP. Hồ Chí Minh
                  </p>
                </li>
                <li className="space-y-1">
                  <p className="font-semibold text-stone-200 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-champagne-300 shrink-0" />
                    <span>Maison Lumière Đồng Khởi</span>
                  </p>
                  <p className="pl-5 leading-relaxed">
                    88 Đồng Khởi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh
                  </p>
                </li>
                <li className="flex items-center gap-2 pt-0.5 text-stone-400">
                  <Clock className="h-3.5 w-3.5 text-champagne-300 shrink-0" />
                  <span>Mở cửa: 08:30 – 22:00 (Thứ 2 – Chủ Nhật)</span>
                </li>
              </ul>
            </div>

            {/* Cột 4: Bản tin Beauty Club nhận ưu đãi 10% */}
            <div className="lg:col-span-3 space-y-3.5">
              <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-white">
                Lumière Beauty Club
              </h3>
              <p className="text-xs leading-relaxed text-stone-400">
                Đăng ký nhận ưu đãi <strong className="text-champagne-200 font-semibold">10%</strong>{' '}
                cho đơn hàng đầu tiên, lịch ra mắt bộ sưu tập giới hạn và cẩm nang da liễu chuyên sâu.
              </p>

              {newsletterSubscribed ? (
                <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/40 px-3.5 py-3 text-xs text-emerald-200 flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    Cảm ơn bạn đã tham gia Lumière Beauty Club. Mã ưu đãi thành viên mới đã được kích hoạt!
                  </span>
                </div>
              ) : (
                <form onSubmit={handleNewsletterSubmit} className="space-y-2">
                  <div className="relative flex items-center">
                    <input
                      type="email"
                      value={newsletterEmail}
                      onChange={(e) => setNewsletterEmail(e.target.value)}
                      placeholder="Nhập địa chỉ email của bạn..."
                      aria-label="Email đăng ký bản tin Beauty Club"
                      className="w-full rounded-xl border border-stone-800 bg-stone-900/90 pl-3.5 pr-11 py-2.5 text-xs text-white placeholder:text-stone-500 focus:border-champagne-400 focus:outline-none"
                    />
                    <button
                      type="submit"
                      aria-label="Đăng ký nhận ưu đãi 10%"
                      className="absolute right-1.5 flex h-8 w-8 items-center justify-center rounded-lg bg-champagne-500 text-stone-950 transition-colors hover:bg-champagne-400"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="text-[11px] text-stone-500">
                    Bằng việc đăng ký, bạn đồng ý nhận thông tin ưu đãi từ Lumière Beauté.
                  </p>
                </form>
              )}
            </div>
          </div>

          {/* Dải Phương thức thanh toán & Bản quyền cuối trang */}
          <div className="mt-12 border-t border-stone-800/90 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-stone-500 text-center md:text-left">
              © 2026 Lumière Beauté Vietnam. All rights reserved. Hệ thống phân phối mỹ phẩm chính ngạch.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="mr-1 text-[11px] text-stone-500">Thanh toán an toàn:</span>
              <span className="inline-flex items-center gap-1 rounded-md border border-stone-800 bg-stone-900 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-stone-200">
                COD
              </span>
              <span className="inline-flex items-center gap-1 rounded-md border border-stone-800 bg-stone-900 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-sky-300">
                VietQR
              </span>
              <span className="inline-flex items-center gap-1 rounded-md border border-stone-800 bg-stone-900 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-pink-300">
                MoMo
              </span>
              <span className="inline-flex items-center gap-1 rounded-md border border-stone-800 bg-stone-900 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-champagne-200">
                <CreditCard className="h-3 w-3" />
                <span>Visa / Mastercard</span>
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* Mini-Cart trượt bên phải (duy nhất 1 instance toàn trang) */}
      <CartDrawer isOpen={cartDrawerOpen} onClose={closeCartDrawer} />

      {/* Xem nhanh sản phẩm Quick-View Modal (duy nhất 1 instance toàn trang) */}
      <ProductQuickViewModal
        product={quickViewProduct}
        onClose={closeQuickView}
        onAddedToCart={handleQuickViewAdded}
      />
    </div>
  );
}

export default StorefrontLayout;
