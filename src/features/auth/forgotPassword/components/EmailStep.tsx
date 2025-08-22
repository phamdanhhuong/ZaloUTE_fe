
import React, { useState } from "react";
import { Form, Input, Typography } from "antd";
import { MailOutlined, CheckCircleOutlined } from "@ant-design/icons";
import styles from "@/app/register/page.module.css";

const { Title, Text } = Typography;

interface EmailStepProps {
  onNext?: (email: string) => void;
}

const EmailStep: React.FC<EmailStepProps> = ({ onNext }) => {
  const [email, setEmail] = useState("");
  const [emailValid, setEmailValid] = useState<boolean | null>(null);

  const handleEmailChange = (value: string) => {
    setEmail(value);
    // Đơn giản: kiểm tra định dạng email
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    setEmailValid(value ? valid : null);
  };

  const handleNext = () => {
    if (emailValid && onNext) onNext(email);
  };

  return (
    <div className={styles.stepContent}>
      <Title level={4} className={styles.stepTitle}>
        Nhập địa chỉ email
      </Title>
      <Text type="secondary" className={styles.stepDescription}>
        Chúng tôi sẽ gửi mã xác thực đến email này
      </Text>

      <Form.Item
        name="email"
        rules={[
          { required: true, message: "Vui lòng nhập email" },
          { type: "email", message: "Email không hợp lệ" },
        ]}
      >
        <Input
          prefix={<MailOutlined />}
          placeholder="example@email.com"
          size="large"
          value={email}
          onChange={(e) => handleEmailChange(e.target.value)}
          className={styles.input}
          suffix={
            emailValid !== null &&
            (emailValid ? (
              <CheckCircleOutlined className={styles.successIcon} />
            ) : (
              <div className={styles.emailValidIcon} />
            ))
          }
        />
      </Form.Item>
      {emailValid === false && (
        <Text type="danger" className={styles.errorText}>
          Vui lòng nhập email hợp lệ
        </Text>
      )}
      <div className={styles.buttonContainer}>
        <button
          className={styles.primaryButton}
          style={{ width: "100%", marginTop: 12 }}
          disabled={!emailValid}
          onClick={handleNext}
        >
          Tiếp tục
        </button>
      </div>
    </div>
  );
};

export default EmailStep;
