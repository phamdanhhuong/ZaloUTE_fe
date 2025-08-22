import axiosClient from "@/infrastructure/http/axiosClient";

export interface RegisterData {
  username: string;
  password: string;
  email: string;
  firstname: string;
  lastname: string;
  phone: string;
}

export interface OTPData {
  email: string;
  otp: string;
}

export interface EmailValidationResponse {
  isValid: boolean;
  message?: string;
}

export interface OTPResponse {
  message?: string;
  id?: string;
  username?: string;
  email?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface RegisterResponse {
  success: boolean;
  message?: string;
}

// Validate email
export const validateEmail = async (
  email: string
): Promise<EmailValidationResponse> => {
  try {
    const response: any = await axiosClient.post("/user/validate-email", {
      email,
    });
    //console.log("Email validation response:", response);

    // Trả về data từ response structure của server
    return response as EmailValidationResponse;
  } catch (error) {
    console.error("Email validation error:", error);
    throw error;
  }
};

// Send OTP
export const sendOTP = async (
  registerData: RegisterData
): Promise<OTPResponse> => {
  try {
    const response: OTPResponse = await axiosClient.post(
      "/user/register",
      registerData
    );
    return response as OTPResponse;
  } catch (error) {
    console.error("Send OTP error:", error);
    throw error;
  }
};

// Resend OTP
export const resendOTP = async (email: string): Promise<OTPResponse> => {
  try {
    const response: OTPResponse = await axiosClient.post("/user/resend-otp", {
      email,
    });
    return response as OTPResponse;
  } catch (error) {
    console.error("Resend OTP error:", error);
    throw error;
  }
};

// Verify OTP and complete registration
export const verifyOTPAndRegister = async (
  otpData: OTPData
): Promise<RegisterResponse> => {
  try {
    const response: RegisterResponse = await axiosClient.post(
      "/user/activate-account",
      otpData
    );
    return response as RegisterResponse;
  } catch (error) {
    console.error("Verify OTP error:", error);
    throw error;
  }
};
