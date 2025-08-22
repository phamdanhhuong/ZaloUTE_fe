
import React from "react";
import { Result, Button } from "antd";
import { CheckCircleOutlined } from "@ant-design/icons";
import styles from "@/app/register/page.module.css";

const SuccessStep: React.FC = () => {
  return (
    <Result
      icon={<CheckCircleOutlined className={styles.successIcon} />}
      title="Đặt lại mật khẩu thành công!"
      subTitle="Bạn đã thay đổi mật khẩu thành công. Hãy đăng nhập lại với mật khẩu mới."
      extra={[
        <Button
          type="primary"
          key="login"
          onClick={() => window.location.href = "/login"}
        >
          Đăng nhập
        </Button>,
      ]}
    />
  );
};

export default SuccessStep;
