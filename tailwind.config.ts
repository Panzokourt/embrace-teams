import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
  	container: {
  		center: true,
  		padding: '1.5rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
  		screens: {
  			narrow: '992px',
  			standard: '1200px',
  			wide: '1440px'
  		},
  		fontFamily: {
  			sans: ['Geist Variable', 'sans-serif'],
  			display: ['Geist Variable', 'sans-serif'],
  			mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace']
  		},
  		colors: {
  			border: 'var(--border)',
  			input: 'var(--input)',
  			ring: 'var(--ring)',
  			background: 'var(--background)',
  			foreground: 'var(--foreground)',
  			primary: {
  				DEFAULT: 'var(--primary)',
  				foreground: 'var(--primary-foreground)'
  			},
  			secondary: {
  				DEFAULT: 'var(--secondary)',
  				foreground: 'var(--secondary-foreground)'
  			},
  			destructive: {
  				DEFAULT: 'var(--destructive)',
  				foreground: 'var(--destructive-foreground)'
  			},
  			success: {
  				DEFAULT: 'var(--success)',
  				foreground: 'var(--success-foreground)'
  			},
  			warning: {
  				DEFAULT: 'var(--warning)',
  				foreground: 'var(--warning-foreground)'
  			},
  			muted: {
  				DEFAULT: 'var(--muted)',
  				foreground: 'var(--muted-foreground)'
  			},
  			accent: {
  				DEFAULT: 'var(--accent)',
  				foreground: 'var(--accent-foreground)'
  			},
  			popover: {
  				DEFAULT: 'var(--popover)',
  				foreground: 'var(--popover-foreground)'
  			},
  			card: {
  				DEFAULT: 'var(--card)',
  				foreground: 'var(--card-foreground)'
  			},
  			sidebar: {
  				DEFAULT: 'var(--sidebar)',
  				foreground: 'var(--sidebar-foreground)',
  				primary: 'var(--sidebar-primary)',
  				'primary-foreground': 'var(--sidebar-primary-foreground)',
  				accent: 'var(--sidebar-accent)',
  				'accent-foreground': 'var(--sidebar-accent-foreground)',
  				border: 'var(--sidebar-border)',
  				ring: 'var(--sidebar-ring)'
  			},
  			chart: {
  				'1': 'var(--chart-1)',
  				'2': 'var(--chart-2)',
  				'3': 'var(--chart-3)',
  				'4': 'var(--chart-4)',
  				'5': 'var(--chart-5)',
  				'6': 'var(--chart-6)'
  			}
  		},
  		borderRadius: {
  			'4xl': 'calc(var(--radius) + 10px)',
  			'3xl': 'calc(var(--radius) + 8px)',
  			'2xl': 'calc(var(--radius) + 4px)',
  			xl: 'calc(var(--radius) + 2px)',
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		boxShadow: {
  			soft: '0 2px 8px -2px rgb(0 0 0 / 0.04), 0 4px 16px -4px rgb(0 0 0 / 0.06)',
  			'soft-lg': '0 4px 12px -4px rgb(0 0 0 / 0.06), 0 8px 24px -8px rgb(0 0 0 / 0.08)',
  			'soft-xl': '0 8px 20px -6px rgb(0 0 0 / 0.08), 0 16px 40px -12px rgb(0 0 0 / 0.1)',
  			'inner-soft': 'inset 0 1px 2px 0 rgb(0 0 0 / 0.04)',
  			'2xs': 'var(--shadow-2xs)',
  			xs: 'var(--shadow-xs)',
  			sm: 'var(--shadow-sm)',
  			md: 'var(--shadow-md)',
  			lg: 'var(--shadow-lg)',
  			xl: 'var(--shadow-xl)',
  			'2xl': 'var(--shadow-2xl)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: { height: '0', opacity: '0' },
  				to: { height: 'var(--radix-accordion-content-height)', opacity: '1' }
  			},
  			'accordion-up': {
  				from: { height: 'var(--radix-accordion-content-height)', opacity: '1' },
  				to: { height: '0', opacity: '0' }
  			},
  			'fade-in': {
  				from: { opacity: '0', transform: 'translateY(8px)' },
  				to: { opacity: '1', transform: 'translateY(0)' }
  			},
  			'fade-out': {
  				from: { opacity: '1', transform: 'translateY(0)' },
  				to: { opacity: '0', transform: 'translateY(8px)' }
  			},
  			'scale-in': {
  				from: { opacity: '0', transform: 'scale(0.96)' },
  				to: { opacity: '1', transform: 'scale(1)' }
  			},
  			'slide-in-right': {
  				from: { transform: 'translateX(100%)' },
  				to: { transform: 'translateX(0)' }
  			},
  			'slide-out-right': {
  				from: { transform: 'translateX(0)' },
  				to: { transform: 'translateX(100%)' }
  			},
  			shimmer: {
  				'0%': { backgroundPosition: '-200% 0' },
  				'100%': { backgroundPosition: '200% 0' }
  			},
  			'slide-up': {
  				from: { opacity: '0', transform: 'translateY(12px)' },
  				to: { opacity: '1', transform: 'translateY(0)' }
  			},
  			'slide-down': {
  				from: { opacity: '0', transform: 'translateY(-12px)' },
  				to: { opacity: '1', transform: 'translateY(0)' }
  			},
  			bounce: {
  				'0%, 100%': { transform: 'translateY(0)' },
  				'50%': { transform: 'translateY(-4px)' }
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
  			'accordion-up': 'accordion-up 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
  			'fade-in': 'fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
  			'fade-out': 'fade-out 0.2s ease-out forwards',
  			'scale-in': 'scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
  			'slide-in-right': 'slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
  			'slide-out-right': 'slide-out-right 0.2s ease-out',
  			shimmer: 'shimmer 2s linear infinite',
  			'slide-up': 'slide-up 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
  			'slide-down': 'slide-down 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
  			bounce: 'bounce 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
  		},
  		transitionTimingFunction: {
  			apple: 'cubic-bezier(0.16, 1, 0.3, 1)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
