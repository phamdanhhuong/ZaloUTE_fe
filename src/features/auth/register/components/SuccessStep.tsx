import React from "react";
import { Result, Button } from "antd";
import { CheckCircleOutlined } from "@ant-design/icons";
import styles from "../../../../app/register/page.module.css";

interface SuccessStepProps {
  onContinue?: () => void;
}

export const SuccessStep: React.FC<SuccessStepProps> = ({ onContinue }) => {
  return (
    <Result
      icon={<CheckCircleOutlined className={styles.successIcon} />}
      title="Đăng ký thành công!"
      subTitle="Tài khoản của bạn đã được tạo thành công. Chào mừng bạn đến với dịch vụ của chúng tôi!"
      extra={[
        <Button
          type="primary"
          key="continue"
          onClick={onContinue || (() => window.location.reload())}
        >
          Tiếp tục
        </Button>,
      ]}
    />
  );
};
