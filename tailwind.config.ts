import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./data/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./types/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        forest: "#3F513F",
        sage: "#7D8F7A",
        gold: "#D4AF37",
        cream: "#E8E1D4",
        night: "#1F2D3D",
        porcelain: "#FBF8F1",
        rosewood: "#9E6F66",
        mist: "#DDE6DE"
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "PingFang SC",
          "Microsoft YaHei",
          "sans-serif"
        ],
        serif: [
          "Georgia",
          "Times New Roman",
          "Songti SC",
          "SimSun",
          "serif"
        ]
      },
      boxShadow: {
        soft: "0 18px 42px rgba(31, 45, 61, 0.08)",
        quiet: "0 8px 22px rgba(63, 81, 63, 0.07)"
      },
      backgroundImage: {
        "grain-soft":
          "radial-gradient(circle at top left, rgba(212, 175, 55, 0.14), transparent 28rem), radial-gradient(circle at bottom right, rgba(125, 143, 122, 0.18), transparent 24rem)"
      },
      opacity: {
        12: "0.12",
        16: "0.16",
        18: "0.18",
        22: "0.22",
        28: "0.28",
        32: "0.32",
        34: "0.34",
        35: "0.35",
        38: "0.38",
        45: "0.45",
        52: "0.52",
        54: "0.54",
        55: "0.55",
        56: "0.56",
        58: "0.58",
        62: "0.62",
        64: "0.64",
        65: "0.65",
        66: "0.66",
        68: "0.68",
        72: "0.72",
        76: "0.76",
        82: "0.82",
        88: "0.88"
      }
    }
  },
  plugins: []
};

export default config;
