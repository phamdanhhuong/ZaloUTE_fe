
import React, { useState } from "react";
import { Form, Input, Button, Typography } from "antd";
import styles from "@/app/register/page.module.css";

const { Title, Text } = Typography;


interface OTPStepProps {
  email: string;
  onNext?: (otp: string) => void;
}

const OTPStep: React.FC<OTPStepProps> = ({ email, onNext }) => {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleOtpChange = (value: string) => {
    setOtp(value.replace(/\D/g, ""));
  };

  const handleResendOTP = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1000); // giả lập gửi lại OTP
  };

  const handleNext = () => {
    if (otp.length === 6 && onNext) onNext(otp);
  };

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
          onChange={(e) => handleOtpChange(e.target.value)}
          className={styles.otpInput}
        />
      </Form.Item>

      <div className={styles.resendSection}>
        <Text type="secondary" className={styles.resendText}>
          Không nhận được mã?{" "}
        </Text>
        <Button
          type="link"
          onClick={handleResendOTP}
          disabled={loading}
          className={styles.resendButton}
        >
          Gửi lại mã OTP
        </Button>
      </div>
      <div className={styles.buttonContainer}>
        <button
          className={styles.primaryButton}
          style={{ width: "100%", marginTop: 12 }}
          disabled={otp.length !== 6}
          onClick={handleNext}
        >
          Tiếp tục
        </button>
      </div>
    </div>
  );
};

export default OTPStep;
