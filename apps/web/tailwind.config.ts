import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#10251d",
        cream: "#f7f5ee",
        lime: "#c9f66b",
        mint: "#dff5e8",
        coral: "#ff7a59",
      },
      boxShadow: { soft: "0 24px 70px rgba(16, 37, 29, 0.10)" },
    },
  },
  plugins: [],
} satisfies Config;
