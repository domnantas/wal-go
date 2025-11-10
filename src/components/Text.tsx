import {
  Platform,
  PlatformColor,
  Text as RNText,
  TextProps as RNTextProps,
} from "react-native";
export const Text = ({ style, ...rest }: RNTextProps) => {
  return (
    <RNText
      style={[
        {
          color: Platform.select({
            ios: PlatformColor("label"),
            android: PlatformColor("?android:attr/textColor"),
          }),
        },
        style,
      ]}
      {...rest}
    />
  );
};
