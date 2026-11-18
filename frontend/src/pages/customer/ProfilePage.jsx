import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Crown,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Package,
  Phone,
  Save,
  ShieldCheck,
  ShoppingBag,
  User,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getApiErrorMessage } from '../../api/clients';
import { useCustomerAuth } from '../../contexts/PortalAuthContext';
import { useToast } from '../../contexts/ToastContext';
import { formatDate } from '../../utils/format';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ProfilePage() {
  const { user, updateProfile, changePassword } = useCustomerAuth();
  const toast = useToast();

  // Form cập nhật hồ sơ cá nhân & địa chỉ nhận hàng
  const [profileForm, setProfileForm] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Form đổi mật khẩu
  const [pwForm, setPwForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [showPasswords, setShowPasswords] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (!user) return;
    setProfileForm({
      full_name: user.full_name || '',
      email: user.email || '',
      phone: user.phone || '',
      address: user.address || '',
    });
  }, [user]);

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setProfileError('');

    const fullName = profileForm.full_name.trim();
    const email = profileForm.email.trim().toLowerCase();
    const phone = profileForm.phone.trim();
    const address = profileForm.address.trim();

    if (!fullName) {
      setProfileError('Vui lòng nhập họ và tên của bạn.');
      return;
    }
    if (!email || !EMAIL_REGEX.test(email)) {
      setProfileError('Địa chỉ email không đúng định dạng.');
      return;
    }
    if (phone && !/^[0-9+\s.-]{8,15}$/.test(phone)) {
      setProfileError('Số điện thoại không hợp lệ (8–15 chữ số).');
      return;
    }

    setSavingProfile(true);
    try {
      const res = await updateProfile({
        full_name: fullName,
        email,
        phone: phone || null,
        address: address || null,
      });
      toast.success(res.message || 'Đã lưu thông tin hồ sơ thành viên!');
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Không thể cập nhật thông tin hồ sơ.');
      setProfileError(msg);
      toast.error(msg);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePassword = async (event) => {
    event.preventDefault();
    setPasswordError('');

    if (!pwForm.current_password || !pwForm.new_password) {
      setPasswordError('Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới.');
      return;
    }
    if (pwForm.new_password.length < 6) {
      setPasswordError('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }
    if (pwForm.new_password !== pwForm.confirm_password) {
      setPasswordError('Mật khẩu xác nhận không khớp với mật khẩu mới.');
      return;
    }
    if (pwForm.current_password === pwForm.new_password) {
      setPasswordError('Mật khẩu mới cần khác với mật khẩu hiện tại.');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await changePassword({
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      });
      setPwForm({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
      toast.success(res?.message || 'Cập nhật mật khẩu mới thành công!');
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Không thể đổi mật khẩu.');
      setPasswordError(msg);
      toast.error(msg);
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="pb-20">
      {/* Header Banner */}
      <div className="border-b border-champagne-200/80 bg-gradient-to-br from-champagne-50 via-white to-lumiere-50/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-7 sm:py-9">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-xs font-medium text-stone-500 mb-3"
          >
            <Link to="/" className="hover:text-lumiere-700 transition-colors">
              Trang chủ
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-stone-400" />
            <span className="font-semibold text-stone-900">Tài khoản của tôi</span>
          </nav>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-stone-950">
                Không Gian Thành Viên
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-stone-600">
                Quản lý thông tin liên hệ, sổ địa chỉ giao nhận mặc định và bảo mật tài khoản của bạn.
              </p>
            </div>

            <Link
              to="/orders"
              className="inline-flex items-center gap-2 rounded-full bg-stone-950 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-lumiere-800 transition-colors"
            >
              <Package className="h-4 w-4 text-champagne-300" />
              <span>Đơn mua của tôi</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Lumière Beauty Club Membership Card */}
          <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-24">
            <div className="overflow-hidden rounded-3xl border border-stone-200/80 bg-white shadow-sm">
              {/* Luxury Dark Membership Crest */}
              <div className="relative overflow-hidden bg-gradient-to-br from-stone-950 via-lumiere-950 to-stone-900 p-6 text-white">
                <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-champagne-400/20 blur-2xl" />
                <div className="relative flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.2em] text-champagne-200 mb-5">
                  <span className="inline-flex items-center gap-1.5">
                    <Crown className="h-3.5 w-3.5 text-champagne-300" />
                    <span>Lumière Beauty Club</span>
                  </span>
                  <span>VIP Member</span>
                </div>

                <div className="relative flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 font-serif text-2xl font-bold text-champagne-100 ring-1 ring-white/25 backdrop-blur-sm">
                    {(user?.full_name || 'KH').trim().charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-serif text-xl font-bold text-white truncate">
                      {user?.full_name}
                    </h2>
                    <p className="text-xs text-stone-300 truncate">@{user?.username}</p>
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-200 ring-1 ring-emerald-300/30">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Tài khoản đã xác thực</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Member Details & Quick Links */}
              <div className="p-6 space-y-4">
                <div className="space-y-2.5 text-xs sm:text-sm text-stone-600">
                  <div className="flex items-center justify-between">
                    <span className="text-stone-400">Hạng thành viên</span>
                    <span className="rounded-full bg-champagne-100/80 px-2.5 py-0.5 text-xs font-bold text-champagne-900">
                      Lumière Insider
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-400">Tên tài khoản</span>
                    <span className="font-bold text-stone-900">{user?.username}</span>
                  </div>
                  {user?.created_at && (
                    <div className="flex items-center justify-between">
                      <span className="text-stone-400 flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Ngày gia nhập</span>
                      </span>
                      <span className="font-bold text-stone-900">
                        {formatDate(user.created_at)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2.5 border-t border-stone-100 pt-4">
                  <Link
                    to="/orders"
                    className="flex items-center justify-center gap-1.5 rounded-2xl border border-stone-200 bg-stone-50/70 px-3 py-2.5 text-xs font-bold text-stone-800 hover:border-stone-900 hover:bg-white transition-colors"
                  >
                    <Package className="h-3.5 w-3.5 text-lumiere-700" />
                    <span>Lịch sử đơn</span>
                  </Link>
                  <Link
                    to="/cart"
                    className="flex items-center justify-center gap-1.5 rounded-2xl border border-stone-200 bg-stone-50/70 px-3 py-2.5 text-xs font-bold text-stone-800 hover:border-stone-900 hover:bg-white transition-colors"
                  >
                    <ShoppingBag className="h-3.5 w-3.5 text-lumiere-700" />
                    <span>Giỏ hàng</span>
                  </Link>
                </div>

                <div className="rounded-2xl bg-champagne-50/80 border border-champagne-200/70 p-3.5 text-xs leading-relaxed text-stone-600 flex items-start gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-lumiere-700 shrink-0 mt-0.5" />
                  <span>
                    Thông tin người nhận lưu tại đây sẽ tự động áp dụng khi thanh toán giúp bạn đặt
                    mua mỹ phẩm nhanh chóng hơn.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Profile & Password Forms */}
          <div className="lg:col-span-8 space-y-8">
            {/* Section 1: Thông tin cá nhân & Sổ địa chỉ */}
            <form
              onSubmit={handleSaveProfile}
              className="rounded-3xl border border-stone-200/80 bg-white p-6 sm:p-8 shadow-sm space-y-5"
            >
              <div className="border-b border-stone-100 pb-4">
                <h2 className="font-serif text-xl font-bold text-stone-950">
                  Thông Tin Cá Nhân &amp; Sổ Địa Chỉ Giao Nhận
                </h2>
                <p className="mt-0.5 text-xs text-stone-500">
                  Cập nhật họ tên, email nhận hóa đơn điện tử và địa chỉ giao hàng mặc định của bạn
                </p>
              </div>

              {profileError && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs sm:text-sm text-rose-700"
                >
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{profileError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="cust-prof-fullname"
                    className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5"
                  >
                    Họ và tên <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                    <input
                      id="cust-prof-fullname"
                      type="text"
                      required
                      value={profileForm.full_name}
                      onChange={(e) =>
                        setProfileForm((prev) => ({ ...prev, full_name: e.target.value }))
                      }
                      className="w-full rounded-2xl border border-stone-200 bg-stone-50/40 pl-10 pr-3.5 py-3 text-sm text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="cust-prof-email"
                    className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5"
                  >
                    Địa chỉ Email <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                    <input
                      id="cust-prof-email"
                      type="email"
                      required
                      value={profileForm.email}
                      onChange={(e) =>
                        setProfileForm((prev) => ({ ...prev, email: e.target.value }))
                      }
                      className="w-full rounded-2xl border border-stone-200 bg-stone-50/40 pl-10 pr-3.5 py-3 text-sm text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="cust-prof-phone"
                    className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5"
                  >
                    Số điện thoại nhận hàng
                  </label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                    <input
                      id="cust-prof-phone"
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) =>
                        setProfileForm((prev) => ({ ...prev, phone: e.target.value }))
                      }
                      placeholder="Nhập số điện thoại liên hệ..."
                      className="w-full rounded-2xl border border-stone-200 bg-stone-50/40 pl-10 pr-3.5 py-3 text-sm text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="cust-prof-username"
                    className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1.5"
                  >
                    Tên tài khoản định danh
                  </label>
                  <input
                    id="cust-prof-username"
                    type="text"
                    disabled
                    value={user?.username || ''}
                    className="w-full rounded-2xl border border-stone-200 bg-stone-100/80 px-3.5 py-3 text-sm font-semibold text-stone-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="cust-prof-address"
                  className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5"
                >
                  Địa chỉ giao hàng mặc định
                </label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-stone-400" />
                  <textarea
                    id="cust-prof-address"
                    rows={2}
                    value={profileForm.address}
                    onChange={(e) =>
                      setProfileForm((prev) => ({ ...prev, address: e.target.value }))
                    }
                    placeholder="Số nhà, đường, Phường/Xã, Quận/Huyện, Tỉnh/Thành phố..."
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50/40 pl-10 pr-3.5 py-3 text-sm text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="inline-flex items-center gap-2 rounded-full bg-stone-950 px-7 py-3 text-sm font-bold text-white shadow-sm hover:bg-lumiere-800 disabled:cursor-not-allowed disabled:opacity-60 transition-all"
                >
                  {savingProfile ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span>Lưu Thông Tin Hồ Sơ</span>
                </button>
              </div>
            </form>

            {/* Section 2: Bảo mật mật khẩu */}
            <form
              onSubmit={handleSavePassword}
              className="rounded-3xl border border-stone-200/80 bg-white p-6 sm:p-8 shadow-sm space-y-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-4">
                <div>
                  <h2 className="font-serif text-xl font-bold text-stone-950">
                    Đổi Mật Khẩu Tài Khoản
                  </h2>
                  <p className="mt-0.5 text-xs text-stone-500">
                    Nên thay đổi mật khẩu định kỳ để bảo vệ an toàn tài khoản thành viên của bạn
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPasswords((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-50 transition-colors"
                >
                  {showPasswords ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  <span>{showPasswords ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}</span>
                </button>
              </div>

              {passwordError && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs sm:text-sm text-rose-700"
                >
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{passwordError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label
                    htmlFor="cust-prof-current-pw"
                    className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5"
                  >
                    Mật khẩu hiện tại <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                    <input
                      id="cust-prof-current-pw"
                      type={showPasswords ? 'text' : 'password'}
                      required
                      value={pwForm.current_password}
                      onChange={(e) =>
                        setPwForm((prev) => ({ ...prev, current_password: e.target.value }))
                      }
                      placeholder="••••••"
                      className="w-full rounded-2xl border border-stone-200 bg-stone-50/40 pl-10 pr-3 py-3 text-sm text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="cust-prof-new-pw"
                    className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5"
                  >
                    Mật khẩu mới <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                    <input
                      id="cust-prof-new-pw"
                      type={showPasswords ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={pwForm.new_password}
                      onChange={(e) =>
                        setPwForm((prev) => ({ ...prev, new_password: e.target.value }))
                      }
                      placeholder="Tối thiểu 6 ký tự"
                      className="w-full rounded-2xl border border-stone-200 bg-stone-50/40 pl-10 pr-3 py-3 text-sm text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="cust-prof-confirm-pw"
                    className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5"
                  >
                    Xác nhận mật khẩu mới <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                    <input
                      id="cust-prof-confirm-pw"
                      type={showPasswords ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={pwForm.confirm_password}
                      onChange={(e) =>
                        setPwForm((prev) => ({ ...prev, confirm_password: e.target.value }))
                      }
                      placeholder="Nhập lại mật khẩu mới"
                      className="w-full rounded-2xl border border-stone-200 bg-stone-50/40 pl-10 pr-3 py-3 text-sm text-stone-900 focus:border-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="inline-flex items-center gap-2 rounded-full border-2 border-stone-950 bg-white px-7 py-2.5 text-sm font-bold text-stone-950 hover:bg-stone-950 hover:text-white disabled:cursor-not-allowed disabled:opacity-60 transition-all"
                >
                  {savingPassword ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <KeyRound className="h-4 w-4" />
                  )}
                  <span>Cập Nhật Mật Khẩu</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
