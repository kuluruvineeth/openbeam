import { create } from "zustand";
import type { AuthState, SessionUser, TeamMembership } from "../lib/auth-types";

type AuthStoreState = {
  authState: AuthState;
  user: SessionUser | null;
  selectedTeamId: string | null;
  teams: TeamMembership[];
  biometricEnabled: boolean;
  biometricUnlocked: boolean;
  onboardingComplete: boolean;
};

type AuthStoreActions = {
  setAuthState: (state: AuthState) => void;
  setUser: (user: SessionUser | null) => void;
  setSelectedTeamId: (teamId: string | null) => void;
  setTeams: (teams: TeamMembership[]) => void;
  setBiometricEnabled: (enabled: boolean) => void;
  setBiometricUnlocked: (unlocked: boolean) => void;
  setOnboardingComplete: (complete: boolean) => void;
  reset: () => void;
};

type AuthStore = AuthStoreState & AuthStoreActions;

const initialState: AuthStoreState = {
  authState: "loading",
  user: null,
  selectedTeamId: null,
  teams: [],
  biometricEnabled: false,
  biometricUnlocked: false,
  onboardingComplete: false,
};

export const useAuthStore = create<AuthStore>((set) => ({
  ...initialState,

  setAuthState: (authState) => set({ authState }),
  setUser: (user) => set({ user }),
  setSelectedTeamId: (selectedTeamId) => set({ selectedTeamId }),
  setTeams: (teams) => set({ teams }),
  setBiometricEnabled: (biometricEnabled) => set({ biometricEnabled }),
  setBiometricUnlocked: (biometricUnlocked) => set({ biometricUnlocked }),
  setOnboardingComplete: (onboardingComplete) => set({ onboardingComplete }),
  reset: () => set(initialState),
}));
