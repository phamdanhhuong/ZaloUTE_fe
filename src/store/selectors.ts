import { RootState } from "../store";

// User selectors
export const selectUser = (state: RootState) => state.user.user;
export const selectToken = (state: RootState) => state.user.token;
export const selectIsAuthenticated = (state: RootState) =>
  state.user.isAuthenticated;
export const selectUserLoading = (state: RootState) => state.user.loading;

// Derived selectors
export const selectUserFullName = (state: RootState) => {
  const user = state.user.user;
  if (!user) return null;
  return `${user.firstname} ${user.lastname}`.trim();
};

export const selectUserInitials = (state: RootState) => {
  const user = state.user.user;
  if (!user) return "";
  const firstInitial = user.firstname?.charAt(0)?.toUpperCase() || "";
  const lastInitial = user.lastname?.charAt(0)?.toUpperCase() || "";
  return `${firstInitial}${lastInitial}`;
};
