import { TextInput as RNTextInput, TextInputProps } from "react-native";
import { StyleSheet, withUnistyles } from "react-native-unistyles";

const UniTextInput = withUnistyles(RNTextInput, (theme) => ({
  placeholderTextColor: theme.colors.mutedForeground,
}));

export const TextInput = (props: TextInputProps) => {
  const isEditable = props.editable ?? true;
  return (
    <UniTextInput
      {...props}
      style={[styles.textInput(isEditable), props.style]}
      aria-disabled={!isEditable}
    />
  );
};

const styles = StyleSheet.create((theme) => ({
  textInput: (editable: boolean) => ({
    display: "flex",
    height: theme.gap(9),
    width: "100%",
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: "transparent",
    paddingLeft: theme.gap(3),
    paddingRight: theme.gap(3),
    paddingTop: theme.gap(1),
    paddingBottom: theme.gap(1),
    color: theme.colors.foreground,
    fontSize: {
      xs: theme.fontSize("base"),
      md: theme.fontSize("sm"),
    },
    boxShadow: theme.shadow("sm"),
    opacity: editable ? 1 : 0.5,
    _web: {
      "_focus-visible": {
        outlineStyle: "solid",
        outlineWidth: 1,
        outlineColor: theme.colors.ring,
      },
      _disabled: {
        cursor: "not-allowed",
        opacity: 0.5,
      },
    },
  }),
}));
