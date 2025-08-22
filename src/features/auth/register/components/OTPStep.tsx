import React from "react";
import { Form, Input, Button, Typography } from "antd";
import styles from "../../../../app/register/page.module.css";

const { Title, Text } = Typography;

interface OTPStepProps {
  email: string;
  otp: string;
  loading: boolean;
  onOtpChange: (otp: string) => void;
  onResendOTP: () => void;
}

export const OTPStep: React.FC<OTPStepProps> = ({
  email,
  otp,
  loading,
  onOtpChange,
  onResendOTP,
}) => {
  return (
    <div className={styles.stepContent}>
      <Title level={4} className={styles.stepTitle}>
        Xác thực OTP
      </Title>
      <Text type="secondary" className={styles.stepDescription}>
        Mã xác thực đã được gửi đến <strong>{email}</strong>
      </Text>

      <Form.Item
        name="otp"
        rules={[
          { required: true, message: "Vui lòng nhập mã OTP" },
          { len: 6, message: "Mã OTP phải có 6 chữ số" },
        ]}
      >
        <Input
          placeholder="123456"
          size="large"
          maxLength={6}
          value={otp}
          onChange={(e) => onOtpChange(e.target.value.replace(/\D/g, ""))}
          className={styles.otpInput}
        />
      </Form.Item>

      <div className={styles.resendSection}>
        <Text type="secondary" className={styles.resendText}>
          Không nhận được mã?{" "}
        </Text>
        <Button
          type="link"
          onClick={onResendOTP}
          disabled={loading}
          className={styles.resendButton}
        >
          Gửi lại mã OTP
        </Button>
      </div>
    </div>
  );
};
