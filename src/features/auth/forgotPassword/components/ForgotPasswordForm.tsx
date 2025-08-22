import React, { useState } from "react";
import EmailStep from "./EmailStep";
import OTPStep from "./OTPStep";
import ResetPasswordStep from "./ResetPasswordStep";
import SuccessStep from "./SuccessStep";
import { Card, message } from "antd";
import styles from "@/app/register/page.module.css";
import { sendForgotPasswordEmail, verifyForgotPasswordOTP, resetPassword } from "../service";

// Các bước của flow quên mật khẩu
const steps = ["email", "otp", "reset", "success"] as const;
type Step = typeof steps[number];

const ForgotPasswordForm: React.FC = () => {
  const [step, setStep] = useState<Step>("email");

  // State dùng chung cho các bước
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState("");

  // Handler chuyển bước
  const handleNext = () => {
    const idx = steps.indexOf(step);
    if (idx < steps.length - 1) setStep(steps[idx + 1]);
  };

  return (
    <Card className={styles.card}>
      {step === "email" && (
        <EmailStep
          onNext={async (email) => {
            setLoading(true);
            try {
              const res = await sendForgotPasswordEmail(email);
              console.log("Forgot password email response:", res);
              // Nếu response có statusCode 201 hoặc message thành công thì chuyển bước
              if ((res && (res.statusCode === 201 || res.message?.toLowerCase().includes("success")))) {
                setEmail(email);
                handleNext();
              } else {
                message.error(res.message || "Gửi email thất bại");
              }
            } catch (err) {
              message.error("Gửi email thất bại");
            } finally {
              setLoading(false);
            }
          }}
        />
      )}
      {step === "otp" && (
        <OTPStep
          email={email}
          onNext={async (otpValue) => {
            setLoading(true);
            try {
              const res = await verifyForgotPasswordOTP({ email, otp: otpValue });
              console.log("Verify OTP response:", res);
              if (
                res &&
                (res.statusCode === 201 ||
                  res.statusCode === 200 ||
                  res.message?.toLowerCase().includes("success"))
              ) {
                setOtp(otpValue);
                handleNext();
              } else {
                message.error(res.message || "OTP không đúng");
              }
            } catch (err) {
              message.error("Xác thực OTP thất bại");
            } finally {
              setLoading(false);
            }
          }}
        />
      )}
      {step === "reset" && (
        <ResetPasswordStep
          onNext={async (password) => {
            setLoading(true);
            try {
              console.log("Reset password params:", { email, otp, newPassword: password });
              const res = await resetPassword({ email, otp, newPassword: password });
              if (
                res &&
                (res.statusCode === 201 ||
                  res.statusCode === 200 ||
                  res.message?.toLowerCase().includes("success"))
              ) {
                handleNext();
              } else {
                message.error(res.message || "Đặt lại mật khẩu thất bại");
              }
            } catch (err) {
              message.error("Đặt lại mật khẩu thất bại");
            } finally {
              setLoading(false);
            }
          }}
        />
      )}
      {step === "success" && <SuccessStep />}
    </Card>
  );
};

export default ForgotPasswordForm;
