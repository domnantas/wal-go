import { Tabs } from "expo-router";
import { Map, NotebookText } from "lucide-react-native";

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: "Žemėlapis",
          tabBarIcon: ({ color, size }) => <Map color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: "Žurnalas",
          tabBarIcon: ({ color, size }) => (
            <NotebookText color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
