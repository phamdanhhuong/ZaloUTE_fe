
import React, { useState } from "react";
import { Form, Input, Typography } from "antd";
import styles from "@/app/register/page.module.css";

const { Title, Text } = Typography;


interface ResetPasswordStepProps {
  onNext?: (password: string) => void;
}

const ResetPasswordStep: React.FC<ResetPasswordStepProps> = ({ onNext }) => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setError("");
  };
  const handleConfirmChange = (value: string) => {
    setConfirm(value);
    setError("");
  };

  const validate = () => {
    if (password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự");
      return false;
    }
    if (password !== confirm) {
      setError("Mật khẩu xác nhận không khớp");
      return false;
    }
    setError("");
    return true;
  };

  const handleNext = () => {
    if (validate() && onNext) onNext(password);
  };

  return (
    <div className={styles.stepContent}>
      <Title level={4} className={styles.stepTitle}>
        Đặt lại mật khẩu mới
      </Title>
      <Text type="secondary" className={styles.stepDescription}>
        Vui lòng nhập mật khẩu mới cho tài khoản của bạn
      </Text>

      <Form.Item
        name="password"
        rules={[
          { required: true, message: "Vui lòng nhập mật khẩu mới" },
          { min: 6, message: "Mật khẩu phải có ít nhất 6 ký tự" },
        ]}
      >
        <Input.Password
          placeholder="Mật khẩu mới"
          size="large"
          value={password}
          onChange={(e) => handlePasswordChange(e.target.value)}
          className={styles.input}
        />
      </Form.Item>
      <Form.Item
        name="confirm"
        rules={[
          { required: true, message: "Vui lòng xác nhận mật khẩu" },
        ]}
      >
        <Input.Password
          placeholder="Xác nhận mật khẩu mới"
          size="large"
          value={confirm}
          onChange={(e) => handleConfirmChange(e.target.value)}
          className={styles.input}
        />
      </Form.Item>
      {error && (
        <Text type="danger" className={styles.errorText}>
          {error}
        </Text>
      )}
      <div className={styles.buttonContainer}>
        <button
          className={styles.primaryButton}
          style={{ width: "100%", marginTop: 12 }}
          onClick={handleNext}
          disabled={password.length < 6 || password !== confirm}
        >
          Tiếp tục
        </button>
      </div>
    </div>
  );
};

export default ResetPasswordStep;
