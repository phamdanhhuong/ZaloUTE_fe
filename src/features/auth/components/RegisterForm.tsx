import React from "react";
import { Form, Button, Space } from "antd";
import { useRegister, CurrentStep } from "../hooks/useRegister";
import { StepIndicator } from "./StepIndicator";
import { EmailStep } from "./EmailStep";
import { PersonalStep } from "./PersonalStep";
import { OTPStep } from "./OTPStep";
import styles from "../../../app/register/page.module.css";

interface RegisterFormProps {
  onStepChange?: (step: CurrentStep) => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onStepChange }) => {
  const {
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
  } = useRegister(onStepChange);

  const [form] = Form.useForm();

  return (
    <>
      <StepIndicator current={getStepNumber()} />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleNextStep}
        size="large"
      >
        {currentStep === "email" && (
          <EmailStep
            email={formData.email}
            emailValid={emailValid}
            onEmailChange={handleEmailChange}
          />
        )}

        {currentStep === "personal" && (
          <PersonalStep formData={formData} onFieldChange={handleFieldChange} />
        )}

        {currentStep === "otp" && (
          <OTPStep
            email={formData.email}
            otp={formData.otp}
            loading={loading}
            onOtpChange={(otp) => handleFieldChange("otp", otp)}
            onResendOTP={handleResendOTP}
          />
        )}

        <div className={styles.buttonContainer}>
          <Space className={styles.buttonSpace}>
            {currentStep !== "email" && (
              <Button
                onClick={handleBackStep}
                disabled={loading}
                size="large"
                className={styles.button}
              >
                Quay lại
              </Button>
            )}
            <Button
              type="primary"
              htmlType="submit"
              disabled={!canProceed() || loading}
              loading={loading}
              size="large"
              className={styles.primaryButton}
              style={{
                marginLeft: currentStep === "email" ? "auto" : 0,
              }}
            >
              {loading
                ? "Đang xử lý..."
                : currentStep === "otp"
                ? "Xác thực"
                : "Tiếp tục"}
            </Button>
          </Space>
        </div>
      </Form>
    </>
  );
};
