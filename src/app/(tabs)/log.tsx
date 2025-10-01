import { Button } from "@/components/Button";
import { StyleSheet, View } from "react-native";

export default function Log() {
  return (
    <View style={styles.container}>
      <Button>Add random log</Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 100,
    flex: 1,
    alignItems: "center",
  },
});
