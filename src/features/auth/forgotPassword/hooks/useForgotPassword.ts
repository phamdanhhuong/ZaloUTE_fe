import { useState } from "react";

type ForgotPasswordStep = "email" | "otp" | "reset" | "success";

export function useForgotPassword() {
  const [step, setStep] = useState<ForgotPasswordStep>("email");
  // Thêm các state khác nếu cần
  return { step, setStep };
}
