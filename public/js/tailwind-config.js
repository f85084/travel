// Tailwind CSS 配置
tailwind.config = {
  theme: {
    extend: {
      colors: {
        fuji: {
          blue: "#3777bc", // 富士藍
          white: "#ffffff", // 雪白
          grey: "#f4f4f6", // 暖灰
          text: "#2c3e50",
          accent: "#e74c3c",
        },
      },
      animation: {
        "slide-in-right": "slide-in-right 0.2s ease-out",
      },
      keyframes: {
        "slide-in-right": {
          "0%": { transform: "translateX(20px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
      },
    },
  },
};
