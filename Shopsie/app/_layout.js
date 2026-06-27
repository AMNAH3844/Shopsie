// import { Stack } from "expo-router";

// export default function Layout() {
//   return (
//     <Stack screenOptions={{ headerShown: false }}>
//       <Stack.Screen name="index" />
//       <Stack.Screen name="signin/index" />
//       <Stack.Screen name="forgot-password/index" />
//       <Stack.Screen name="reset-password/index" />
//       <Stack.Screen name="signup/index" />
//       <Stack.Screen name="role/index" />
//       <Stack.Screen name="customer/index" />
//       <Stack.Screen name="shopkeeper/index" />
//       <Stack.Screen name="rider/index" />
//     </Stack>
//   );
// }
import { Stack } from "expo-router";

export default function Layout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}