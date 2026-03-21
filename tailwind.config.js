import { fontFamily } from 'tailwindcss/defaultTheme';

/** @type {import('tailwindcss').Config} */
export const content = [
	'./pages/**/*.{js,jsx}',
	'./components/**/*.{js,jsx}',
	'./app/**/*.{js,jsx}',
	'./src/**/*.{js,jsx}',
];
export const theme = {
	container: {
		center: true,
		padding: '2rem',
		screens: {
			'2xl': '1400px',
		},
	},
	extend: {
    colors: {
      border: 'hsl(var(--border))',
      input: 'hsl(var(--input))',
      ring: 'hsl(var(--ring))',
      background: 'hsl(var(--background))',
      foreground: 'hsl(var(--foreground))',
      primary: {
        DEFAULT: 'hsl(var(--primary))',
        foreground: 'hsl(var(--primary-foreground))',
      },
      secondary: {
        DEFAULT: 'hsl(var(--secondary))',
        foreground: 'hsl(var(--secondary-foreground))',
      },
      destructive: {
        DEFAULT: 'hsl(var(--destructive))',
        foreground: 'hsl(var(--destructive-foreground))',
      },
      muted: {
        DEFAULT: 'hsl(var(--muted))',
        foreground: 'hsl(var(--muted-foreground))',
      },
      accent: {
        DEFAULT: 'hsl(var(--accent))',
        foreground: 'hsl(var(--accent-foreground))',
      },
      popover: {
        DEFAULT: 'hsl(var(--popover))',
        foreground: 'hsl(var(--popover-foreground))',
      },
      card: {
        DEFAULT: 'hsl(var(--card))',
        foreground: 'hsl(var(--card-foreground))',
      },
    },
		borderRadius: {
			lg: `var(--radius)`,
			md: `calc(var(--radius) - 2px)`,
			sm: 'calc(var(--radius) - 4px)',
		},
		fontFamily: {
			sans: ['Inter', ...fontFamily.sans],
		},
		keyframes: {
			'accordion-down': {
				from: { height: 0 },
				to: { height: 'var(--radix-accordion-content-height)' },
			},
			'accordion-up': {
				from: { height: 'var(--radix-accordion-content-height)' },
				to: { height: 0 },
			},
			'gift-float': {
				'0%':   { transform: 'translateY(0) scale(1)',   opacity: '1' },
				'80%':  { transform: 'translateY(-120px) scale(1.2)', opacity: '0.8' },
				'100%': { transform: 'translateY(-160px) scale(0.8)', opacity: '0' },
			},
			'gift-pop': {
				'0%':   { transform: 'scale(0) translateY(20px)', opacity: '0' },
				'60%':  { transform: 'scale(1.15) translateY(-4px)', opacity: '1' },
				'100%': { transform: 'scale(1) translateY(0)',    opacity: '1' },
			},
		},
		animation: {
			'accordion-down': 'accordion-down 0.2s ease-out',
			'accordion-up': 'accordion-up 0.2s ease-out',
			'gift-float': 'gift-float 1.2s ease-out forwards',
			'gift-pop':   'gift-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards',
		},
    boxShadow: {
      'glow-gold': '0 0 12px hsl(var(--primary) / 0.25)',
      'glow-gold-lg': '0 0 10px hsl(var(--primary) / 0.3)',
      'glow-gold-focus': '0 0 5px hsl(var(--primary) / 0.4)',
    },
	},
};
export const plugins = [require('tailwindcss-animate')];