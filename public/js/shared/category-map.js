const categoryMap = {
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

export const getCategoryColor = (tag) => categoryMap[tag]?.color || "bg-gray-400";
export const getCategoryIcon = (tag) =>
  categoryMap[tag]?.icon || "fa-map-marker-alt";
export const getCategoryBadgeStyle = (tag) =>
  categoryMap[tag]?.badge || "text-gray-600 bg-gray-600";
export const hasParkingInfo = (item) =>
  ["停車", "車位", "Parking", "P"].some((keyword) =>
    (item.note || "").includes(keyword),
  );
