import axiosClient from "@/infrastructure/http/axiosClient";
import { LoginUser } from "@/features/auth/login/service";

export interface ProfileResponse {
  user: LoginUser;
}

export interface UpdateProfileRequest {
  firstname?: string;
  lastname?: string;
  phone?: string;
  email?: string;
}

export interface UpdateProfileResponse {
  user: LoginUser;
  message: string;
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

export const updateUserProfile = async (data: UpdateProfileRequest): Promise<LoginUser> => {
  try {
    const response: UpdateProfileResponse = await axiosClient.put("/user/profile/update", data);
    return response.user;
  } catch (error) {
    console.error("Update user profile failed:", error);
    throw error;
  }
};

export interface UploadAvatarResponse {
  message: string;
  avatarUrl: string;
}

export const uploadAvatar = async (file: File): Promise<UploadAvatarResponse> => {
  try {
    const formData = new FormData();
    formData.append('avatar', file);
    
    const response: UploadAvatarResponse = await axiosClient.post("/user/profile/upload-avatar", formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response;
  } catch (error) {
    console.error("Upload avatar failed:", error);
    throw error;
  }
};
