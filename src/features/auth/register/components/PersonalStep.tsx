import React from "react";
import { Form, Input, Typography, Row, Col } from "antd";
import { PhoneOutlined } from "@ant-design/icons";
import styles from "../../../../app/register/page.module.css";
import { FormData } from "../hooks/useRegister";

const { Title, Text } = Typography;

interface PersonalStepProps {
  formData: FormData;
  onFieldChange: (field: keyof FormData, value: string) => void;
}

export const PersonalStep: React.FC<PersonalStepProps> = ({
  formData,
  onFieldChange,
}) => {
  return (
    <div className={styles.stepContent}>
      <Title level={4} className={styles.stepTitle}>
        Thông tin cá nhân
      </Title>
      <Text type="secondary" className={styles.stepDescription}>
        Vui lòng điền đầy đủ thông tin của bạn
      </Text>

      <Form.Item
        name="username"
        rules={[
          { required: true, message: "Vui lòng nhập tên đăng nhập" },
          { min: 4, message: "Tên đăng nhập phải có ít nhất 4 ký tự" },
        ]}
      >
        <Input
          placeholder="Tên đăng nhập"
          size="large"
          value={formData.username}
          onChange={(e) => onFieldChange("username", e.target.value)}
          className={styles.input}
        />
      </Form.Item>
      <Form.Item
        name="password"
        rules={[
          { required: true, message: "Vui lòng nhập mật khẩu" },
          { min: 6, message: "Mật khẩu phải có ít nhất 6 ký tự" },
        ]}
      >
        <Input.Password
          placeholder="Mật khẩu"
          size="large"
          value={formData.password}
          onChange={(e) => onFieldChange("password", e.target.value)}
          className={styles.input}
        />
      </Form.Item>
      <Row gutter={16} className={styles.personalRow}>
        <Col span={12}>
          <Form.Item
            name="firstName"
            rules={[{ required: true, message: "Vui lòng nhập họ" }]}
          >
            <Input
              placeholder="Nguyễn"
              size="large"
              value={formData.firstname}
              onChange={(e) => onFieldChange("firstname", e.target.value)}
              className={styles.input}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="lastName"
            rules={[{ required: true, message: "Vui lòng nhập tên" }]}
          >
            <Input
              placeholder="Văn A"
              size="large"
              value={formData.lastname}
              onChange={(e) => onFieldChange("lastname", e.target.value)}
              className={styles.input}
            />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        name="phone"
        rules={[
          { required: true, message: "Vui lòng nhập số điện thoại" },
          {
            pattern: /^[0-9]{10,11}$/,
            message: "Số điện thoại không hợp lệ",
          },
        ]}
      >
        <Input
          prefix={<PhoneOutlined />}
          placeholder="0123456789"
          size="large"
          value={formData.phone}
          onChange={(e) => onFieldChange("phone", e.target.value)}
          className={styles.input}
        />
      </Form.Item>
    </div>
  );
};
