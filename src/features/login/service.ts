import axiosClient from "@/infrastructure/http/axiosClient";

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface LoginUser {
  id: string;
  username: string;
  email: string;
  firstname: string;
  lastname: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponse {
  user: LoginUser;
  accessToken: string;
}

export const login = async (
  payload: LoginRequest
): Promise<LoginResponse> => {
  try{
    const response: LoginResponse = await axiosClient.post(
      "/user/login",
      payload
  );
  return response as LoginResponse;
} catch (error) {
    console.error("Login failed:", error);
    throw error;
  }
};


