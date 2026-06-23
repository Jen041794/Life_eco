// 商品行銷標籤的顏色（前台卡片絲帶 + 後台列表徽章共用，確保顏色一致）
export const TAG_COLORS = {
  新商品: "#f26430", // 珊瑚橘（主色）
  限量倒數: "#dc3545", // 紅
  熱賣: "#e8590c", // 深橘
};

export const tagColor = (tag) => TAG_COLORS[tag] || "#f26430";
