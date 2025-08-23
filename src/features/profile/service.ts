import axiosClient from "@/infrastructure/http/axiosClient";
import { LoginUser } from "@/features/auth/login/service";

export interface ProfileResponse {
  user: LoginUser;
}

export const getUserProfile = async (): Promise<LoginUser> => {
  try {
    const response: LoginUser = await axiosClient.get("/user/profile");
    return response;
  } catch (error) {
    console.error("Get user profile failed:", error);
    throw error;
  }
};
