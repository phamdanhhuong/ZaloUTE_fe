import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { LoginUser } from "@/features/auth/login/service";

interface UserState {
  user: LoginUser | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
}

const initialState: UserState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    loginSuccess: (
      state,
      action: PayloadAction<{ user: LoginUser; token: string }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.loading = false;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.loading = false;
      // Clear localStorage
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    },
    updateUser: (state, action: PayloadAction<Partial<LoginUser>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    initializeFromStorage: (state) => {
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("token");
        const userString = localStorage.getItem("user");

        if (token && userString) {
          try {
            const user = JSON.parse(userString);
            state.user = user;
            state.token = token;
            state.isAuthenticated = true;
          } catch (error) {
            console.error("Error parsing user from localStorage:", error);
            // Clear invalid data
            localStorage.removeItem("token");
            localStorage.removeItem("user");
          }
        }
      }
    },
  },
});

export const {
  setLoading,
  loginSuccess,
  logout,
  updateUser,
  initializeFromStorage,
} = userSlice.actions;

export default userSlice.reducer;
