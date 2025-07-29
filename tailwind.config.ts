import type { Config } from "tailwindcss";

// all in fixtures is set to tailwind v3 as interims solutions

const config: Config = {
    darkMode: ["class"],
    content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
  	extend: {
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			},
  			'blur-in': {
  				'0%': {
  					filter: 'blur(20px)',
  					opacity: '0'
  				},
  				'50%': {
  					filter: 'blur(10px)',
  					opacity: '0.5'
  				},
  				'100%': {
  					filter: 'blur(0px)',
  					opacity: '1'
  				}
  			},
        'background-pan': {
          '0%': { backgroundPosition: '0% center' },
          '100%': { backgroundPosition: '-200% center' },
        },
        'shimmer': {
          '0%': { transform: 'translateX(-100%) skewX(-20deg)' },
          '100%': { transform: 'translateX(200%) skewX(-20deg)' },
        },
        'gradient-x': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'blur-in': 'blur-in 1.5s ease-out',
        'background-pan': 'background-pan 10s linear infinite',
        'shimmer': 'shimmer 4s ease-in-out infinite',
        'gradient-x': 'gradient-x 3s ease infinite',
  		},
  		textShadow: {
  			'default': '2px 2px 4px rgba(0, 0, 0, 0.8)',
  			'lg': '4px 4px 8px rgba(0, 0, 0, 0.8)',
  			'xl': '6px 6px 12px rgba(0, 0, 0, 0.8)'
  		}
  	}
  },
  plugins: [
    require("tailwindcss-animate"),
    function({ addUtilities }: any) {
      const newUtilities = {
        '.text-shadow': {
          'text-shadow': '2px 2px 4px rgba(0, 0, 0, 0.8)',
        },
        '.text-shadow-lg': {
          'text-shadow': '4px 4px 8px rgba(0, 0, 0, 0.8)',
        },
        '.text-shadow-xl': {
          'text-shadow': '6px 6px 12px rgba(0, 0, 0, 0.8)',
        },
      }
      addUtilities(newUtilities)
    }
  ],
};
export default config;
