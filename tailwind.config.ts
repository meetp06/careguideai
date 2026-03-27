import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', '"Inter"', 'system-ui', 'sans-serif'],
        display: ['"DM Sans"', '"Inter"', 'system-ui', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        "voice-blue": "hsl(var(--voice-blue))",
        "voice-blue-glow": "hsl(var(--voice-blue-glow))",
        "agent-gray": "hsl(var(--agent-gray))",
        "verified-green": "hsl(var(--verified-green))",
        "verified-green-glow": "hsl(var(--verified-green-glow))",
        surface: "hsl(var(--surface))",
        "surface-elevated": "hsl(var(--surface-elevated))",
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fly-1": {
          "0%": { transform: "translateY(100vh) rotate(0deg) scale(0.8)", opacity: "0" },
          "10%": { opacity: "0.2" },
          "90%": { opacity: "0.2" },
          "100%": { transform: "translateY(-10vh) rotate(360deg) scale(1.2)", opacity: "0" },
        },
        "fly-2": {
          "0%": { transform: "translateY(100vh) translateX(-20vw) rotate(0deg) scale(1)", opacity: "0" },
          "10%": { opacity: "0.15" },
          "90%": { opacity: "0.15" },
          "100%": { transform: "translateY(-10vh) translateX(20vw) rotate(-180deg) scale(0.9)", opacity: "0" },
        },
        "fly-3": {
          "0%": { transform: "translateY(100vh) translateX(10vw) rotate(0deg) scale(0.7)", opacity: "0" },
          "10%": { opacity: "0.25" },
          "90%": { opacity: "0.25" },
          "100%": { transform: "translateY(-10vh) translateX(-30vw) rotate(270deg) scale(1.1)", opacity: "0" },
        },
        "leaf-sway": {
          "0%, 100%": { transform: "rotate(-2deg)", transformOrigin: "bottom center" },
          "50%": { transform: "rotate(4deg)", transformOrigin: "bottom center" },
        },
        "leaf-sway-reverse": {
          "0%, 100%": { transform: "rotate(2deg)", transformOrigin: "bottom center" },
          "50%": { transform: "rotate(-4deg)", transformOrigin: "bottom center" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-15px)" },
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fly-leaf-1": "fly-1 15s linear infinite",
        "fly-leaf-2": "fly-2 18s linear infinite",
        "fly-leaf-3": "fly-3 20s linear infinite",
        "leaf-sway": "leaf-sway 6s ease-in-out infinite",
        "leaf-sway-reverse": "leaf-sway-reverse 7s ease-in-out infinite",
        "float": "float 5s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
