import { authClient } from "@/lib/auth-client";
import { Tabs } from "expo-router";
import { Map, NotebookText, User } from "lucide-react-native";

export default function TabLayout() {
  const { data } = authClient.useSession();
  return (
    <Tabs screenOptions={{ headerShown: false }}>
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
      <Tabs.Screen
        name="(auth)"
        options={{
          title: data?.user.name ?? "Prisijungti",
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
