import { useAuth } from "@clerk/clerk-expo";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  Icon,
  Label,
  NativeTabs,
  VectorIcon,
} from "expo-router/unstable-native-tabs";
import { Platform } from "react-native";

export default function TabLayout() {
  const { isSignedIn } = useAuth();

  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Label>Žemėlapis</Label>
        {Platform.select({
          ios: <Icon sf="map" />,
          android: (
            <Icon src={<VectorIcon family={MaterialIcons} name="map" />} />
          ),
        })}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(auth)" hidden={isSignedIn}>
        <Label>Prisijungti</Label>
        {Platform.select({
          ios: <Icon sf="person.fill" />,
          android: (
            <Icon src={<VectorIcon family={MaterialIcons} name="person" />} />
          ),
        })}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="log" hidden={!isSignedIn}>
        <Label>Žurnalas</Label>
        {Platform.select({
          ios: <Icon sf="list.bullet" />,
          android: (
            <Icon src={<VectorIcon family={MaterialIcons} name="list" />} />
          ),
        })}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile" hidden={!isSignedIn}>
        <Label>Profilis</Label>
        {Platform.select({
          ios: <Icon sf="person.fill" />,
          android: (
            <Icon src={<VectorIcon family={MaterialIcons} name="person" />} />
          ),
        })}
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
