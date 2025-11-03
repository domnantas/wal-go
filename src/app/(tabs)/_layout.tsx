import { useAuth } from "@clerk/clerk-expo";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { Account } from "jazz-tools";
import { useAccount } from "jazz-tools/react-core";

export default function TabLayout() {
  const { isSignedIn } = useAuth();
  const { me } = useAccount(Account, { resolve: { profile: true } });

  const callsign = me?.profile.name.toUpperCase() ?? "-";

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
        <NativeTabs.Trigger name="profile">
          <Icon sf="person.fill" drawable="custom_settings_drawable" />
          <Label>{callsign}</Label>
        </NativeTabs.Trigger>
      )}
    </NativeTabs>
  );
}
