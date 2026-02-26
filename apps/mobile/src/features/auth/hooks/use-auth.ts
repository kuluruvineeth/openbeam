import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect } from "react";
import {
  getBiometricEnabled,
  getSession,
  getSessionToken,
  getTeamMemberships,
  refreshSession,
  selectTeam as selectTeamClient,
  signInWithOAuth,
  signOut as signOutClient,
} from "../lib";
import type { OAuthProvider } from "../lib/auth-types";
import { useAuthStore } from "../stores/auth-store";

const ONBOARDING_COMPLETE_KEY = "@openplane:onboarding-complete";
const SELECTED_TEAM_KEY = "@openplane:selected-team";

export function useAuth() {
  const authState = useAuthStore((s) => s.authState);
  const user = useAuthStore((s) => s.user);
  const teams = useAuthStore((s) => s.teams);
  const selectedTeamId = useAuthStore((s) => s.selectedTeamId);
  const biometricEnabled = useAuthStore((s) => s.biometricEnabled);
  const onboardingComplete = useAuthStore((s) => s.onboardingComplete);
  const setAuthState = useAuthStore((s) => s.setAuthState);
  const setUser = useAuthStore((s) => s.setUser);
  const setTeams = useAuthStore((s) => s.setTeams);
  const setSelectedTeamId = useAuthStore((s) => s.setSelectedTeamId);
  const setBiometricEnabled = useAuthStore((s) => s.setBiometricEnabled);
  const setOnboardingComplete = useAuthStore((s) => s.setOnboardingComplete);
  const reset = useAuthStore((s) => s.reset);

  const initialize = useCallback(async () => {
    try {
      const token = await getSessionToken();
      if (!token) {
        setAuthState("unauthenticated");
        return;
      }

      const session = await getSession();
      if (!session.user) {
        setAuthState("unauthenticated");
        return;
      }

      setUser(session.user);
      setAuthState("authenticated");

      const [memberships, biometric, onboarding, savedTeam] = await Promise.all(
        [
          getTeamMemberships(),
          getBiometricEnabled(),
          AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY),
          AsyncStorage.getItem(SELECTED_TEAM_KEY),
        ]
      );

      setTeams(memberships);
      setBiometricEnabled(biometric);
      setOnboardingComplete(onboarding === "true");
      if (savedTeam) {
        setSelectedTeamId(savedTeam);
      } else if (memberships.length === 1) {
        setSelectedTeamId(memberships[0].teamId);
      }
    } catch {
      setAuthState("unauthenticated");
    }
  }, [
    setAuthState,
    setUser,
    setTeams,
    setBiometricEnabled,
    setOnboardingComplete,
    setSelectedTeamId,
  ]);

  useEffect(() => {
    // biome-ignore lint/complexity/noVoid: fire-and-forget async call
    void initialize();
  }, [initialize]);

  const signIn = useCallback(
    async (provider: OAuthProvider) => {
      const success = await signInWithOAuth(provider);
      if (success) {
        await initialize();
      }
      return success;
    },
    [initialize]
  );

  const signOut = useCallback(async () => {
    await signOutClient();
    await AsyncStorage.multiRemove([
      ONBOARDING_COMPLETE_KEY,
      SELECTED_TEAM_KEY,
    ]);
    reset();
    setAuthState("unauthenticated");
  }, [reset, setAuthState]);

  const selectTeam = useCallback(
    async (teamId: string) => {
      const success = await selectTeamClient(teamId);
      if (success) {
        setSelectedTeamId(teamId);
        await AsyncStorage.setItem(SELECTED_TEAM_KEY, teamId);
      }
      return success;
    },
    [setSelectedTeamId]
  );

  const completeOnboarding = useCallback(async () => {
    setOnboardingComplete(true);
    await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");
  }, [setOnboardingComplete]);

  const refresh = useCallback(async () => {
    const session = await refreshSession();
    if (session.user) {
      setUser(session.user);
      setAuthState("authenticated");
    } else {
      setAuthState("unauthenticated");
      setUser(null);
    }
  }, [setUser, setAuthState]);

  return {
    authState,
    user,
    teams,
    selectedTeamId,
    biometricEnabled,
    onboardingComplete,
    isAuthenticated: authState === "authenticated",
    isLoading: authState === "loading",
    signIn,
    signOut,
    selectTeam,
    completeOnboarding,
    refresh,
    initialize,
  };
}
