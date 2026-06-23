import { loadStripe } from "@stripe/stripe-js";

// 用 publishable key 載入 Stripe.js，整個 App 共用一個 promise（只載一次）
export const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
);
