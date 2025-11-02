import { useAuth } from "@clerk/clerk-expo";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";

export default function TabLayout() {
  const { isSignedIn } = useAuth();
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Label>Žemėlapis</Label>
        <Icon sf="map" drawable="custom_android_drawable" />
      </NativeTabs.Trigger>
      {!isSignedIn && (
        <NativeTabs.Trigger name="(auth)">
          <Icon sf="person.fill" drawable="custom_settings_drawable" />
          <Label>Prisijungti</Label>
        </NativeTabs.Trigger>
      )}
      {isSignedIn && (
        <NativeTabs.Trigger name="log">
          <Label>Žurnalas</Label>
          <Icon sf="list.bullet" drawable="custom_android_drawable" />
        </NativeTabs.Trigger>
      )}
      {isSignedIn && (
        <NativeTabs.Trigger name="settings">
          <Icon sf="gear" drawable="custom_settings_drawable" />
          <Label>Nustatymai</Label>
        </NativeTabs.Trigger>
      )}
    </NativeTabs>
  );
}
