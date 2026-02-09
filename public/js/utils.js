// ==================== 常量定義 ====================

// 篩選標籤
export const filterTags = [
  { name: "全部", icon: "fa-list" },
  { name: "景點", icon: "fa-camera" },
  { name: "食", icon: "fa-utensils" },
  { name: "購物", icon: "fa-shopping-bag" },
  { name: "交通", icon: "fa-train-subway" },
  { name: "住宿", icon: "fa-bed" },
  { name: "活動", icon: "fa-person-hiking" },
];

// 分類配置映射
export const categoryMap = {
  食: {
    color: "bg-orange-400",
    icon: "fa-utensils",
    badge: "text-orange-600 bg-orange-600",
  },
  活動: {
    color: "bg-sky-500",
    icon: "fa-person-hiking",
    badge: "text-sky-600 bg-sky-600",
  },
  購物: {
    color: "bg-pink-400",
    icon: "fa-shopping-bag",
    badge: "text-pink-600 bg-pink-600",
  },
  景點: {
    color: "bg-emerald-500",
    icon: "fa-camera",
    badge: "text-emerald-600 bg-emerald-600",
  },
  住宿: {
    color: "bg-indigo-500",
    icon: "fa-bed",
    badge: "text-indigo-600 bg-indigo-600",
  },
  交通: {
    color: "bg-slate-500",
    icon: "fa-train-subway",
    badge: "text-slate-600 bg-slate-600",
  },
};

// ==================== 工具函數 ====================

/**
 * 格式化日期
 * @param {string} dateStr - 日期字符串
 * @returns {string} 格式化後的日期
 */
export function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

/**
 * 計算行程天數
 * @param {string} start - 開始日期
 * @param {string} end - 結束日期
 * @returns {number} 天數
 */
export function calculateDuration(start, end) {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
  const diffTime = Math.abs(e.getTime() - s.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * 獲取分類顏色
 * @param {string} tag - 分類標籤
 * @returns {string} 顏色類名
 */
export function getCategoryColor(tag) {
  return categoryMap[tag]?.color || "bg-gray-400";
}

/**
 * 獲取分類圖標
 * @param {string} tag - 分類標籤
 * @returns {string} 圖標類名
 */
export function getCategoryIcon(tag) {
  return categoryMap[tag]?.icon || "fa-map-marker-alt";
}

/**
 * 獲取分類徽章樣式
 * @param {string} tag - 分類標籤
 * @returns {string} 徽章樣式類名
 */
export function getCategoryBadgeStyle(tag) {
  return categoryMap[tag]?.badge || "text-gray-600 bg-gray-600";
}

/**
 * 檢查是否有停車資訊
 * @param {Object} item - 行程項目
 * @returns {boolean}
 */
export function hasParkingInfo(item) {
  return ["停車", "車位", "Parking", "P"].some((k) =>
    (item.note || "").includes(k),
  );
}

/**
 * Element Plus 提示函數
 * @param {string} message - 提示訊息
 * @param {string} type - 提示類型 (info, success, warning, error)
 */
export function showAlert(message, type = "info") {
  const { ElMessage } = window.ElementPlus;
  ElMessage({
    message,
    type: type === "error" ? "error" : type === "success" ? "success" : "info",
    duration: 2500,
    showClose: true,
  });
}

/**
 * 檢查行程是否已過期
 * @param {Object} trip - 行程對象
 * @returns {boolean}
 */
export function isTripExpired(trip) {
  if (!trip || !trip.endDate) return false;
  const endDate = new Date(trip.endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return endDate < today;
}

/**
 * 獲取行程圖片 URL
 * @param {Object} trip - 行程對象
 * @returns {string}
 */
export function getTripImageUrl(trip) {
  return trip?.imageUrl || "";
}
