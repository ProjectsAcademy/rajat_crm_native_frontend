import { Stack } from 'expo-router';
import { STACK_SCREEN_OPTIONS } from '../../../constants/stackOptions';
import { useFeatureGuard } from '../../../hooks/useFeatureGuard';
import HubBackButton from '../../../components/HubBackButton';

export default function ProjectsLayout() {
  useFeatureGuard('projects');
  return (
    <Stack
      screenOptions={STACK_SCREEN_OPTIONS}
    >
      <Stack.Screen name="index" options={{ title: 'Projects', headerLeft: () => <HubBackButton hub="/(app)/work" /> }} />
      <Stack.Screen name="[id]" options={{ title: 'Project Detail' }} />
    </Stack>
  );
}
