export type SessionUser = {
  id: string;
  email: string;
  name: string;
  image: string | null;
};

export type Session = {
  user: SessionUser | null;
};

export type AuthState = "loading" | "unauthenticated" | "authenticated";

export type OAuthProvider = "google" | "github";

export type TeamMembership = {
  id: string;
  teamId: string;
  teamName: string;
  teamSlug: string;
  teamLogo: string | null;
  role: "OWNER" | "ADMIN" | "MEMBER";
};

export type BiometricType = "fingerprint" | "facial" | "iris" | "none";

export type OnboardingStep =
  | "welcome"
  | "team-select"
  | "connect-sources"
  | "complete";
