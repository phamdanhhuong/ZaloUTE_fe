
import axiosClient from "@/infrastructure/http/axiosClient";

export interface ForgotPasswordEmailData {
  email: string;
}

export interface ForgotPasswordOTPData {
  email: string;
  otp: string;
}

export interface ResetPasswordData {
  email: string;
  otp: string;
  newPassword: string;
}

export interface ForgotPasswordResponse {
  success: boolean;
  message?: string;
}

// Gửi email quên mật khẩu
export const sendForgotPasswordEmail = async (
  email: string
): Promise<ForgotPasswordResponse> => {
  try {
    const response = await axiosClient.post("/user/forgot-password", { email });
    // axiosClient interceptor đã trả về response.data hoặc response.data.data
    return response;
  } catch (error) {
    console.error("Send forgot password email error:", error);
    throw error;
  }
};

// Xác thực OTP quên mật khẩu
export const verifyForgotPasswordOTP = async (
  data: ForgotPasswordOTPData
): Promise<ForgotPasswordResponse> => {
  try {
    const response = await axiosClient.post("/user/forgot-password/verify-otp", data);
    return response;
  } catch (error) {
    console.error("Verify forgot password OTP error:", error);
    throw error;
  }
};

// Đặt lại mật khẩu mới
export const resetPassword = async (
  data: ResetPasswordData
): Promise<ForgotPasswordResponse> => {
  try {
    const response = await axiosClient.post("/user/forgot-password/reset", data);
    return response;
  } catch (error) {
    console.error("Reset password error:", error);
    throw error;
  }
};
