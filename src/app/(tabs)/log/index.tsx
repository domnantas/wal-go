import { Button, StyleSheet, Text } from "react-native";
import {
  KeyboardAwareScrollView,
  KeyboardToolbar,
} from "react-native-keyboard-controller";

export default function Log() {
  return (
    <>
      <KeyboardAwareScrollView bottomOffset={62}>
        <Text style={styles.text}>aaaaaaaaaaa</Text>
        <Text style={styles.text}>aaaaaaaaaaa</Text>
        <Text style={styles.text}>aaaaaaaaaaa</Text>
        <Text style={styles.text}>aaaaaaaaaaa</Text>
        <Text style={styles.text}>aaaaaaaaaaa</Text>
        <Text style={styles.text}>aaaaaaaaaaa</Text>
        <Text style={styles.text}>aaaaaaaaaaa</Text>
        <Text style={styles.text}>aaaaaaaaaaa</Text>
        <Text style={styles.text}>aaaaaaaaaaa</Text>
        <Text style={styles.text}>aaaaaaaaaaa</Text>
        <Text style={styles.text}>aaaaaaaaaaa</Text>
        <Text style={styles.text}>aaaaaaaaaaa</Text>
        <Text style={styles.text}>aaaaaaaaaaa</Text>
        <Text style={styles.text}>aaaaaaaaaaa</Text>
        <Text style={styles.text}>aaaaaaaaaaa</Text>
        <Text style={styles.text}>aaaaaaaaaaa</Text>
        <Text style={styles.text}>aaaaaaaaaaa</Text>
        <Text style={styles.text}>aaaaaaaaaaa</Text>
        <Text style={styles.text}>aaaaaaaaaaa</Text>
        <Text style={styles.text}>aaaaaaaaaaa</Text>
      </KeyboardAwareScrollView>
      <KeyboardToolbar>
        <KeyboardToolbar.Prev />
        <KeyboardToolbar.Next />
        <KeyboardToolbar.Done />
      </KeyboardToolbar>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    padding: 16,
  },
  scrollView: {
    gap: 16,
  },
  textInput: {
    height: 45,
    borderWidth: 1,
    borderRadius: 8,
    borderColor: "#d8d8d8",
    backgroundColor: "#fff",
  },
  text: {
    fontSize: 32,
  },
});
