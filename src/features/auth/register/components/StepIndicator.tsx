import React from "react";
import { Steps } from "antd";
import { MailOutlined, UserOutlined, SafetyOutlined } from "@ant-design/icons";
import styles from "../../../../app/register/page.module.css";

interface StepIndicatorProps {
  current: number;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ current }) => {
  return (
    <Steps
      current={current}
      size="small"
      className={styles.stepIndicator}
      items={[
        {
          title: "Email",
          icon: <MailOutlined />,
        },
        {
          title: "Thông tin",
          icon: <UserOutlined />,
        },
        {
          title: "Xác thực",
          icon: <SafetyOutlined />,
        },
      ]}
    />
  );
};
