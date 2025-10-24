import { useState } from "react";
import { message } from "antd";
import {
  validateEmail,
  sendOTP,
  resendOTP,
  verifyOTPAndRegister,
  type RegisterData,
  type OTPData,
} from "../service";

export type CurrentStep = "email" | "personal" | "otp" | "success";

export interface FormData {
  username: string;
  password: string;
  email: string;
  firstname: string;
  lastname: string;
  phone: string;
  otp: string;
}

export const useRegister = (onStepChange?: (step: CurrentStep) => void) => {
  const [currentStep, setCurrentStep] = useState<CurrentStep>("email");
  const [formData, setFormData] = useState<FormData>({
    username: "",
    password: "",
    email: "",
    firstname: "",
    lastname: "",
    phone: "",
    otp: "",
  });
  const [loading, setLoading] = useState(false);
  const [emailValid, setEmailValid] = useState<boolean | null>(null);

  const validateEmailField = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (email: string) => {
    setFormData((prev) => ({ ...prev, email }));

    if (email) {
      setEmailValid(validateEmailField(email));
    } else {
      setEmailValid(null);
    }
  };

  const handleFieldChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNextStep = async () => {
    setLoading(true);

    try {
      if (currentStep === "email") {
        const result = await validateEmail(formData.email);
        if (result.isValid) {
          setCurrentStep("personal");
          onStepChange?.("personal");
          message.success("Email hợp lệ! Tiếp tục nhập thông tin cá nhân.");
        }
      } else if (currentStep === "personal") {
        const registerData: RegisterData = {
          username: formData.username,
          password: formData.password,
          email: formData.email,
          firstname: formData.firstname,
          lastname: formData.lastname,
          phone: formData.phone,
        };
  // In real app, call sendOTP API
  const result = await sendOTP(registerData);
        if (result.id !== undefined) {
          setCurrentStep("otp");
          onStepChange?.("otp");
          message.success("Mã OTP đã được gửi đến email của bạn!");
        }
      } else if (currentStep === "otp") {
        const otpData: OTPData = {
          email: formData.email,
          otp: formData.otp,
        };

        // In real app, call verifyOTPAndRegister API
        const result = await verifyOTPAndRegister(otpData);
        if (result.success) {
          setCurrentStep("success");
          onStepChange?.("success");
          message.success("Xác thực thành công!");
        }
      }
    } catch (error) {
      console.error("Error in handleNextStep:", error);
      message.error("Có lỗi xảy ra, vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  const handleBackStep = () => {
    if (currentStep === "personal") {
      setCurrentStep("email");
    } else if (currentStep === "otp") {
      setCurrentStep("personal");
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    try {
      // In real app, call resendOTP API
      // const result = await resendOTP(formData.email);
      // if (result.success) {
      message.success("Mã OTP mới đã được gửi!");
      // }
    } catch (error) {
      console.error("Error in handleResendOTP:", error);
      message.error("Có lỗi xảy ra khi gửi lại mã OTP!");
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case "email":
        return formData.email && emailValid;
      case "personal":
        return formData.firstname && formData.lastname && formData.phone;
      case "otp":
        return formData.otp.length === 6;
      default:
        return false;
    }
  };

  const getStepNumber = () => {
    switch (currentStep) {
      case "email":
        return 0;
      case "personal":
        return 1;
      case "otp":
        return 2;
      default:
        return 3;
    }
  };

  return {
    currentStep,
    formData,
    loading,
    emailValid,
    handleEmailChange,
    handleFieldChange,
    handleNextStep,
    handleBackStep,
    handleResendOTP,
    canProceed,
    getStepNumber,
  };
};
