import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { isCanceledRequest, publicApi, STORAGE_KEYS } from '../api/clients';
import { formatCurrency } from '../utils/format';
import { useToast } from './ToastContext';

const CartContext = createContext(null);

function normalizeCartItem(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = Number(raw.id ?? raw.product_id);
  if (!Number.isFinite(id) || id <= 0) return null;

  const price = Math.max(0, Number(raw.price ?? raw.unit_price ?? 0) || 0);
  const stockQuantity = Math.max(0, Math.floor(Number(raw.stock_quantity ?? 0) || 0));
  if (stockQuantity <= 0) return null;

  const rawQty = Math.max(1, Math.floor(Number(raw.quantity ?? 1) || 1));
  const quantity = Math.min(rawQty, stockQuantity);
  const name = String(raw.name || raw.product_name || 'Sản phẩm mỹ phẩm');

  return {
    id,
    product_id: id,
    name,
    product_name: name,
    brand_id: raw.brand_id ?? null,
    brand_name: raw.brand_name || '',
    category_id: raw.category_id ?? null,
    category_name: raw.category_name || '',
    volume: raw.volume || '',
    skin_type: raw.skin_type || '',
    image_url: raw.image_url || '',
    price,
    unit_price: price,
    stock_quantity: stockQuantity,
    quantity,
    subtotal: price * quantity,
  };
}

function readCartFromStorage() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.CART);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeCartItem).filter(Boolean);
  } catch {
    window.localStorage.removeItem(STORAGE_KEYS.CART);
    return [];
  }
}

export function CartProvider({ children }) {
  const toast = useToast();
  const [items, setItems] = useState(readCartFromStorage);
  const [syncing, setSyncing] = useState(false);
  const [syncNotices, setSyncNotices] = useState([]);
  const itemsRef = useRef(items);

  useEffect(() => {
    itemsRef.current = items;
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(items));
  }, [items]);

  // Đồng bộ giỏ hàng giữa nhiều tab trình duyệt của Khách hàng
  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key === STORAGE_KEYS.CART) {
        const next = readCartFromStorage();
        itemsRef.current = next;
        setItems(next);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const dismissSyncNotices = useCallback(() => {
    setSyncNotices([]);
  }, []);

  /**
   * Đối chiếu & đồng bộ toàn bộ mặt hàng trong giỏ với dữ liệu mới nhất từ GET /api/products:
   * - Tự động gỡ mặt hàng đã chuyển sang HIDDEN / bị xóa hoặc vừa hết hàng (stock_quantity = 0)
   * - Hạ số lượng đặt về trần tồn kho thực tế nếu nhân viên vừa điều chỉnh giảm kho
   * - Cập nhật đơn giá mới nhất nếu cửa hàng thay đổi giá niêm yết và thông báo rõ cho khách
   */
  const syncCart = useCallback(
    async ({ silent = false, signal } = {}) => {
      const snapshot = itemsRef.current;
      if (!Array.isArray(snapshot) || snapshot.length === 0) {
        return {
          ok: true,
          hasChanges: false,
          priceChanged: false,
          stockChanged: false,
          removedCount: 0,
          notices: [],
          items: [],
        };
      }

      setSyncing(true);
      try {
        const res = await publicApi.get('/products', { signal });
        const liveProducts = Array.isArray(res.data?.data) ? res.data.data : [];
        const liveMap = new Map(liveProducts.map((prod) => [Number(prod.id), prod]));

        const nextItems = [];
        const notices = [];
        let priceChanged = false;
        let stockChanged = false;
        let removedCount = 0;
        let silentMetadataUpdated = false;

        for (const cartItem of snapshot) {
          const live = liveMap.get(Number(cartItem.id));

          if (!live || live.status !== 'ACTIVE') {
            removedCount += 1;
            stockChanged = true;
            notices.push(
              `Sản phẩm "${cartItem.name}" hiện đã tạm ngừng kinh doanh nên được gỡ khỏi giỏ hàng.`
            );
            continue;
          }

          const liveStock = Math.max(0, Math.floor(Number(live.stock_quantity ?? 0) || 0));
          if (liveStock <= 0) {
            removedCount += 1;
            stockChanged = true;
            notices.push(
              `Sản phẩm "${live.name}" vừa hết hàng trong kho nên đã được gỡ khỏi giỏ hàng.`
            );
            continue;
          }

          const livePrice = Math.max(0, Number(live.price ?? 0) || 0);
          let resolvedQty = cartItem.quantity;

          if (cartItem.quantity > liveStock) {
            resolvedQty = liveStock;
            stockChanged = true;
            notices.push(
              `Số lượng "${live.name}" đã được điều chỉnh từ ${cartItem.quantity} xuống ${liveStock} theo tồn kho thực tế.`
            );
          }

          if (Math.round(livePrice) !== Math.round(cartItem.price)) {
            priceChanged = true;
            notices.push(
              `Giá niêm yết của "${live.name}" đã cập nhật từ ${formatCurrency(
                cartItem.price
              )} sang ${formatCurrency(livePrice)}.`
            );
          }

          if (
            liveStock !== cartItem.stock_quantity ||
            live.name !== cartItem.name ||
            (live.image_url || '') !== (cartItem.image_url || '') ||
            (live.volume || '') !== (cartItem.volume || '') ||
            (live.skin_type || '') !== (cartItem.skin_type || '') ||
            (live.brand_name || '') !== (cartItem.brand_name || '')
          ) {
            silentMetadataUpdated = true;
          }

          const refreshed = normalizeCartItem({
            ...cartItem,
            ...live,
            id: Number(live.id),
            price: livePrice,
            stock_quantity: liveStock,
            quantity: resolvedQty,
          });

          if (refreshed) {
            nextItems.push(refreshed);
          }
        }

        const hasChanges = notices.length > 0;
        if (hasChanges || silentMetadataUpdated) {
          itemsRef.current = nextItems;
          setItems(nextItems);
        }

        if (hasChanges) {
          setSyncNotices(notices);
          if (!silent) {
            toast.warning(notices[0], {
              title: 'Đã cập nhật giỏ hàng theo kho thực tế',
              duration: 5000,
            });
          }
        }

        return {
          ok: true,
          hasChanges,
          priceChanged,
          stockChanged,
          removedCount,
          notices,
          items: nextItems,
        };
      } catch (err) {
        if (isCanceledRequest(err)) {
          return {
            ok: false,
            canceled: true,
            hasChanges: false,
            priceChanged: false,
            stockChanged: false,
            removedCount: 0,
            notices: [],
            items: itemsRef.current,
          };
        }
        return {
          ok: false,
          hasChanges: false,
          priceChanged: false,
          stockChanged: false,
          removedCount: 0,
          notices: [],
          items: itemsRef.current,
        };
      } finally {
        setSyncing(false);
      }
    },
    [toast]
  );

  /**
   * Lấy số lượng hiện đang nằm trong giỏ của 1 sản phẩm
   */
  const getItemQuantity = useCallback(
    (productId) => {
      const targetId = Number(productId);
      const found = items.find((item) => item.id === targetId);
      return found ? found.quantity : 0;
    },
    [items]
  );

  /**
   * Thêm sản phẩm vào giỏ hàng (Ràng buộc chặt tổng số lượng <= product.stock_quantity)
   * @returns {{ ok: boolean, code?: string, message: string, quantity?: number }}
   */
  const addToCart = useCallback(
    (product, qty = 1, options = {}) => {
      const silent = Boolean(options?.silent);
      const productId = Number(product?.id ?? product?.product_id);

      if (!product || !Number.isFinite(productId) || productId <= 0) {
        const message = 'Thông tin sản phẩm không hợp lệ.';
        if (!silent) toast.error(message);
        return { ok: false, code: 'INVALID_PRODUCT', message };
      }

      const requestedQty = Math.floor(Number(qty));
      if (!Number.isFinite(requestedQty) || requestedQty <= 0) {
        const message = 'Số lượng thêm vào giỏ hàng phải lớn hơn 0.';
        if (!silent) toast.warning(message);
        return { ok: false, code: 'INVALID_QUANTITY', message };
      }

      const productName = product.name || product.product_name || 'Sản phẩm';
      const stock = Math.max(0, Math.floor(Number(product.stock_quantity ?? 0)));

      if (stock <= 0) {
        const message = `Sản phẩm "${productName}" hiện đang tạm hết hàng.`;
        if (!silent) toast.warning(message);
        return { ok: false, code: 'OUT_OF_STOCK', message, availableStock: 0 };
      }

      const existing = items.find((item) => item.id === productId);
      const currentQty = existing ? existing.quantity : 0;
      const nextTotalQty = currentQty + requestedQty;

      if (nextTotalQty > stock) {
        const message =
          currentQty >= stock
            ? `Bạn đã thêm tối đa ${stock} sản phẩm "${productName}" theo số lượng tồn kho hiện có.`
            : `Kho chỉ còn ${stock} sản phẩm "${productName}" (giỏ hàng của bạn đang có ${currentQty}).`;
        if (!silent) toast.warning(message);
        return {
          ok: false,
          code: 'INSUFFICIENT_STOCK',
          message,
          availableStock: stock,
          currentQuantity: currentQty,
        };
      }

      const normalized = normalizeCartItem({
        ...existing,
        ...product,
        id: productId,
        stock_quantity: stock,
        quantity: nextTotalQty,
      });

      setItems((prev) => {
        const existsInPrev = prev.some((i) => i.id === productId);
        const updated = existsInPrev
          ? prev.map((i) => (i.id === productId ? normalized : i))
          : [...prev, normalized];
        itemsRef.current = updated;
        return updated;
      });

      return {
        ok: true,
        message: `Đã thêm "${productName}" vào giỏ hàng.`,
        quantity: nextTotalQty,
        item: normalized,
      };
    },
    [items, toast]
  );

  /**
   * Cập nhật số lượng của 1 mặt hàng trong giỏ:
   * - Nếu qty <= 0: xóa mặt hàng khỏi giỏ
   * - Nếu qty > stock_quantity: chặn vượt tồn kho, giữ ở mức tối đa stock_quantity và cảnh báo
   */
  const updateQuantity = useCallback(
    (productId, qty, options = {}) => {
      const silent = Boolean(options?.silent);
      const targetId = Number(productId);
      const existing = items.find((item) => item.id === targetId);

      if (!existing) {
        return {
          ok: false,
          code: 'NOT_IN_CART',
          message: 'Không tìm thấy sản phẩm trong giỏ hàng.',
        };
      }

      const parsedQty = Math.floor(Number(qty));
      if (!Number.isFinite(parsedQty)) {
        return {
          ok: false,
          code: 'INVALID_QUANTITY',
          message: 'Số lượng cập nhật không hợp lệ.',
        };
      }

      if (parsedQty <= 0) {
        setItems((prev) => {
          const updated = prev.filter((item) => item.id !== targetId);
          itemsRef.current = updated;
          return updated;
        });
        return {
          ok: true,
          removed: true,
          quantity: 0,
          message: `Đã xóa "${existing.name}" khỏi giỏ hàng.`,
        };
      }

      const maxStock = Math.max(0, Math.floor(Number(existing.stock_quantity ?? 0)));

      if (maxStock <= 0) {
        const message = `Sản phẩm "${existing.name}" hiện đã hết hàng trong kho.`;
        if (!silent) toast.warning(message);
        setItems((prev) => {
          const updated = prev.filter((item) => item.id !== targetId);
          itemsRef.current = updated;
          return updated;
        });
        return {
          ok: false,
          code: 'OUT_OF_STOCK',
          message,
          availableStock: 0,
        };
      }

      if (parsedQty > maxStock) {
        const message = `Sản phẩm "${existing.name}" chỉ còn tối đa ${maxStock} sản phẩm trong kho.`;
        if (!silent) toast.warning(message);

        if (existing.quantity !== maxStock) {
          setItems((prev) => {
            const updated = prev.map((item) =>
              item.id === targetId
                ? { ...item, quantity: maxStock, subtotal: item.price * maxStock }
                : item
            );
            itemsRef.current = updated;
            return updated;
          });
        }

        return {
          ok: false,
          code: 'INSUFFICIENT_STOCK',
          message,
          availableStock: maxStock,
          quantity: maxStock,
        };
      }

      setItems((prev) => {
        const updated = prev.map((item) =>
          item.id === targetId
            ? { ...item, quantity: parsedQty, subtotal: item.price * parsedQty }
            : item
        );
        itemsRef.current = updated;
        return updated;
      });

      return {
        ok: true,
        quantity: parsedQty,
        message: 'Đã cập nhật số lượng sản phẩm.',
      };
    },
    [items, toast]
  );

  /**
   * Xóa 1 sản phẩm khỏi giỏ hàng
   */
  const removeFromCart = useCallback((productId) => {
    const targetId = Number(productId);
    setItems((prev) => {
      const updated = prev.filter((item) => item.id !== targetId);
      itemsRef.current = updated;
      return updated;
    });
  }, []);

  /**
   * Làm trống toàn bộ giỏ hàng (sau khi đặt hàng thành công)
   */
  const clearCart = useCallback(() => {
    itemsRef.current = [];
    setItems([]);
    setSyncNotices([]);
  }, []);

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const totalAmount = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );

  const value = useMemo(
    () => ({
      items,
      totalItems,
      totalAmount,
      syncing,
      syncNotices,
      dismissSyncNotices,
      syncCart,
      getItemQuantity,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
    }),
    [
      items,
      totalItems,
      totalAmount,
      syncing,
      syncNotices,
      dismissSyncNotices,
      syncCart,
      getItemQuantity,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart() phải được sử dụng bên trong <CartProvider>.');
  }
  return ctx;
}
