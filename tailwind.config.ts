import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class"],
    content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		colors: {
  			background: 'var(--bg)',
  			foreground: 'var(--text)',
  			surface: 'var(--surface)',
  			hover: 'var(--hover)',
  			field: { DEFAULT: 'var(--field-bg)', border: 'var(--field-border)' },
  			ink: { DEFAULT: 'var(--text)', 2: 'var(--text-2)', 3: 'var(--text-3)' },
  			card: { DEFAULT: 'var(--surface)', foreground: 'var(--text)' },
  			popover: { DEFAULT: 'var(--surface)', foreground: 'var(--text)' },
  			primary: { DEFAULT: 'var(--accent)', foreground: 'var(--on-accent)' },
  			secondary: { DEFAULT: 'var(--hover)', foreground: 'var(--text)' },
  			muted: { DEFAULT: 'var(--hover)', foreground: 'var(--text-3)' },
  			accent: { DEFAULT: 'var(--accent)', bg: 'var(--accent-bg)', foreground: 'var(--on-accent)' },
  			destructive: { DEFAULT: 'var(--crit)', foreground: 'var(--crit-bg)' },
  			ok: { DEFAULT: 'var(--ok)', bg: 'var(--ok-bg)' },
  			warn: { DEFAULT: 'var(--warn)', bg: 'var(--warn-bg)', strong: 'var(--warn-strong)', border: 'var(--warn-border)' },
  			neutral: { DEFAULT: 'var(--neutral)', bg: 'var(--neutral-bg)' },
  			crit: { DEFAULT: 'var(--crit)', bg: 'var(--crit-bg)' },
  			cmd: { DEFAULT: 'var(--cmd-bg)', text: 'var(--cmd-text)' },
  			border: 'var(--border)',
  			input: 'var(--field-border)',
  			ring: 'var(--accent)',
  		},
  		fontFamily: {
  			sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
  			mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
  		},
  		borderRadius: {
  			lg: '12px',
  			md: '8px',
  			sm: '6px'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: { height: '0' },
  				to: { height: 'var(--radix-accordion-content-height)' }
  			},
  			'accordion-up': {
  				from: { height: 'var(--radix-accordion-content-height)' },
  				to: { height: '0' }
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
