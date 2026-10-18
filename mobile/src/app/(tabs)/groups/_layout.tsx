import { Stack } from 'expo-router';

// Layout simple pour l'onglet Groupes — seul l'index est géré ici
// Les détails groupe sont dans /app/group/[groupId]/ (Stack racine)
export default function GroupsTabLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
