import React from "react";
import { Form, Input, Typography } from "antd";
import { MailOutlined, CheckCircleOutlined } from "@ant-design/icons";
import styles from "../../../../app/register/page.module.css";

const { Title, Text } = Typography;

interface EmailStepProps {
  email: string;
  emailValid: boolean | null;
  onEmailChange: (email: string) => void;
}

export const EmailStep: React.FC<EmailStepProps> = ({
  email,
  emailValid,
  onEmailChange,
}) => {
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
          onChange={(e) => onEmailChange(e.target.value)}
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
    </div>
  );
};
