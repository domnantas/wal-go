import { Pressable, PressableProps, Text } from "react-native";
import { StyleSheet, UnistylesVariants } from "react-native-unistyles";

type ButtonProps = UnistylesVariants<typeof styles> & PressableProps;

export const Button = ({
  children,
  style,
  variant,
  size,
  disabled = false,
  ...props
}: ButtonProps) => {
  styles.useVariants({
    variant,
    size,
  });

  return (
    <Pressable
      role="button"
      {...props}
      disabled={disabled}
      style={(state) => [
        styles.button(Boolean(disabled)),
        typeof style === "function" ? style(state) : style,
      ]}
    >
      {(state) => (
        <Text style={[styles.buttonText]}>
          {typeof children === "function" ? children(state) : children}
        </Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create((theme, runtime) => ({
  button: (disabled: boolean) => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.gap(2),
    borderRadius: theme.radius,
    opacity: disabled ? 0.5 : 1,
    flexShrink: 0,
    _web: {
      "_focus-visible": {
        outlineStyle: "solid",
        outlineWidth: 3,
        outlineColor: theme.colors.ring,
      },
    },
    variants: {
      variant: {
        default: {
          backgroundColor: theme.colors.primary,
          boxShadow: theme.shadow("xs"),
          _web: {
            _hover: {
              backgroundColor: `color-mix(in srgb, ${theme.colors.primary} 90%, transparent)`,
            },
          },
        },
        destructive: {
          backgroundColor: theme.colors.destructive,
          boxShadow: theme.shadow("xs"),
          _web: {
            _hover: {
              backgroundColor: `color-mix(in srgb, ${theme.colors.destructive}, transparent 10%)`,
            },
            "_focus-visible": {
              outlineColor: `color-mix(in srgb, ${theme.colors.destructive} ${
                runtime.colorScheme === "dark" ? 40 : 20
              }%, transparent)`,
            },
          },
        },
        outline: {
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.background,
          boxShadow: theme.shadow("xs"),
          _web: {
            _hover: {
              backgroundColor: theme.colors.accent,
            },
          },
        },
        secondary: {
          backgroundColor: theme.colors.secondary,
          boxShadow: theme.shadow("xs"),
          _web: {
            _hover: {
              backgroundColor: `color-mix(in srgb, ${theme.colors.secondary} 80%, transparent)`,
            },
          },
        },
        ghost: {
          _web: {
            _hover: {
              backgroundColor: theme.colors.accent,
            },
          },
        },
        link: {
          backgroundColor: "transparent",
          color: theme.colors.primary,
          paddingLeft: 0,
          paddingRight: 0,
          height: "auto",
          boxShadow: undefined,
          _web: {
            _hover: {
              textDecorationLine: "underline",
            },
          },
        },
      },
      size: {
        default: {
          height: theme.gap(9),
          paddingLeft: theme.gap(4),
          paddingRight: theme.gap(4),
          paddingTop: theme.gap(2),
          paddingBottom: theme.gap(2),
        },
        sm: {
          height: theme.gap(8),
          paddingLeft: theme.gap(3),
          paddingRight: theme.gap(3),
          fontSize: theme.fontSize("sm"),
        },
        lg: {
          height: theme.gap(10),
          paddingLeft: theme.gap(6),
          paddingRight: theme.gap(6),
          fontSize: theme.fontSize("lg"),
        },
        icon: {
          height: theme.gap(9),
          width: theme.gap(9),
          paddingLeft: 0,
          paddingRight: 0,
          justifyContent: "center",
        },
      },
    },
  }),
  buttonText: {
    variants: {
      variant: {
        default: {
          color: theme.colors.primaryForeground,
        },
        destructive: {
          color: theme.colors.destructiveForeground,
        },
        outline: {
          color: theme.colors.foreground,
        },
        secondary: {
          color: theme.colors.secondaryForeground,
        },
        ghost: {
          color: theme.colors.foreground,
        },
        link: {
          color: theme.colors.primary,
          textDecorationLine: "underline",
        },
      },
      size: {
        default: {
          fontSize: theme.fontSize("sm"),
          fontWeight: 500,
        },
        sm: {
          fontSize: theme.fontSize("sm"),
        },
        lg: {
          fontSize: theme.fontSize("lg"),
        },
        icon: {
          fontSize: theme.fontSize("sm"),
        },
      },
    },
  },
}));
