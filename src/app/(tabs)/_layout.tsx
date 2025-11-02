import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";

export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Label>Žemėlapis</Label>
        <Icon sf="map" drawable="custom_android_drawable" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="log">
        <Label>Žurnalas</Label>
        <Icon sf="list.bullet" drawable="custom_android_drawable" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Icon sf="gear" drawable="custom_settings_drawable" />
        <Label>Nustatymai</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
