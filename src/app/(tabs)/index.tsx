import { Text, View } from "react-native";
import { StyleSheet, UnistylesRuntime } from "react-native-unistyles";

export default function Map() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Map</Text>
      <Text style={styles.text}>
        Selected theme is {UnistylesRuntime.colorScheme}
      </Text>
      <Text style={styles.text}>
        My device is using the {UnistylesRuntime.contentSizeCategory} size.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: theme.colors.foreground,
  },
}));
