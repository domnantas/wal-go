// Email clients cannot read oklch app tokens; keep the brand palette as static sRGB.
export const BRAND = {
	olive: "#41592c",
	rust: "#a8472d",
	golden: "#d7a23d",
	goldenForeground: "#3a2e10",
	brown: "#3d3027",
	white: "#ffffff",
} as const;

// Warm default surface shared by branded emails.
export const WARM_SURFACE: EmailColors = {
	light: {
		background: "#faf3f5",
		card: "#fffdfb",
		cardForeground: "#311c0f",
		border: "#ece0d8",
		mutedForeground: "#8c7b6e",
	},
	dark: {
		background: "#17110c",
		card: "#221a12",
		cardForeground: "#f3ebe3",
		border: "#3a2e24",
		mutedForeground: "#b3a496",
	},
};

export const defaultColors = {
	light: {
		background: "#F5F5F5",
		border: "#E5E5E5",
		card: "#FFFFFF",
		cardForeground: "#0A0A0A",
		foreground: "#262626",
		muted: "#F5F5F5",
		mutedForeground: "#737373",
		primary: "#171717",
		primaryForeground: "#FAFAFA",
	},
	dark: {
		background: "#0A0A0A",
		border: "#2E2E2E",
		card: "#171717",
		cardForeground: "#FAFAFA",
		foreground: "#D4D4D4",
		muted: "#212121",
		mutedForeground: "#A1A1A1",
		primary: "#E5E5E5",
		primaryForeground: "#171717",
	},
};

export interface EmailClassNames {
	body?: string;
	button?: string;
	card?: string;
	codeBlock?: string;
	container?: string;
	content?: string;
	description?: string;
	link?: string;
	logo?: string;
	poweredBy?: string;
	separator?: string;
	title?: string;
}

export interface EmailColors {
	dark?: Partial<typeof defaultColors.dark>;
	light?: Partial<typeof defaultColors.light>;
}

interface EmailStylesProps {
	colors?: EmailColors;
	darkMode?: boolean;
}

export const EmailStyles = ({ colors, darkMode = true }: EmailStylesProps) => (
	<style type="text/css">{`
      .bg-background {
        background-color: ${colors?.light?.background || defaultColors.light.background} !important;
      }
      .bg-card {
        background-color: ${colors?.light?.card || defaultColors.light.card} !important;
      }
      .bg-primary {
        background-color: ${colors?.light?.primary || defaultColors.light.primary} !important;
      }
      .bg-muted {
        background-color: ${colors?.light?.muted || defaultColors.light.muted} !important;
      }
      .border-border {
        border-color: ${colors?.light?.border || defaultColors.light.border} !important;
      }
      .text-card-foreground {
        color: ${colors?.light?.cardForeground || defaultColors.light.cardForeground} !important;
      }
      .text-muted-foreground {
        color: ${colors?.light?.mutedForeground || defaultColors.light.mutedForeground} !important;
      }
      .text-primary {
        color: ${colors?.light?.primary || defaultColors.light.primary} !important;
      }
      .text-primary-foreground {
        color: ${colors?.light?.primaryForeground || defaultColors.light.primaryForeground} !important;
      }
      .logo-dark {
        display: none !important;
      }
      .logo-light {
        display: block !important;
      }

      ${
				darkMode
					? `@media (prefers-color-scheme: dark) {
        .bg-background {
          background-color: ${colors?.dark?.background || defaultColors.dark.background} !important;
        }
        .bg-card {
          background-color: ${colors?.dark?.card || defaultColors.dark.card} !important;
        }
        .bg-primary {
          background-color: ${colors?.dark?.primary || defaultColors.dark.primary} !important;
        }
        .bg-muted {
          background-color: ${colors?.dark?.muted || defaultColors.dark.muted} !important;
        }
        .border-border {
          border-color: ${colors?.dark?.border || defaultColors.dark.border} !important;
        }
        .text-card-foreground {
          color: ${colors?.dark?.cardForeground || defaultColors.dark.cardForeground} !important;
        }
        .text-muted-foreground {
          color: ${colors?.dark?.mutedForeground || defaultColors.dark.mutedForeground} !important;
        }
        .text-primary {
          color: ${colors?.dark?.primary || defaultColors.dark.primary} !important;
        }
        .text-primary-foreground {
          color: ${colors?.dark?.primaryForeground || defaultColors.dark.primaryForeground} !important;
        }
        .logo-dark {
          display: block !important;
        }
        .logo-light {
          display: none !important;
        }
        * {
          box-shadow: none !important;
        }
      }`
					: ""
			}
    `}</style>
);

export default EmailStyles;
