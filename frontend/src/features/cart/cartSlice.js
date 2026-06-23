import { createSlice } from "@reduxjs/toolkit";

// 從 localStorage 還原購物車（重新整理後不會清空）
const itemsFromStorage = JSON.parse(localStorage.getItem("cart") || "[]");

const initialState = {
  // 每個項目存一份快照：{ id, name, price, image, stock, quantity }
  // price 是後端序列化後的字串（如 "100.00"），計算金額時再轉數字
  items: itemsFromStorage,
};

const persist = (state) => {
  localStorage.setItem("cart", JSON.stringify(state.items));
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    // 加入商品；已在車內就累加數量，且不超過庫存
    addItem(state, action) {
      const { quantity = 1, ...product } = action.payload;
      const existing = state.items.find((i) => i.id === product.id);
      if (existing) {
        existing.quantity = Math.min(
          existing.quantity + quantity,
          product.stock,
        );
      } else {
        state.items.push({
          id: product.id,
          name: product.name,
          price: product.price,
          image: product.images?.[0]?.image ?? null,
          stock: product.stock,
          quantity: Math.min(quantity, product.stock),
        });
      }
      persist(state);
    },
    // 直接設定某項數量（1 ~ 庫存之間）
    setQuantity(state, action) {
      const { id, quantity } = action.payload;
      const item = state.items.find((i) => i.id === id);
      if (item) {
        item.quantity = Math.max(1, Math.min(quantity, item.stock));
        persist(state);
      }
    },
    removeItem(state, action) {
      state.items = state.items.filter((i) => i.id !== action.payload);
      persist(state);
    },
    clearCart(state) {
      state.items = [];
      persist(state);
    },
  },
});

export const { addItem, setQuantity, removeItem, clearCart } =
  cartSlice.actions;
export default cartSlice.reducer;

// selectors
export const selectCartItems = (state) => state.cart.items;
export const selectCartCount = (state) =>
  state.cart.items.reduce((sum, i) => sum + i.quantity, 0);
export const selectCartTotal = (state) =>
  state.cart.items.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);
