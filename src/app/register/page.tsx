"use client";
import React, { useState } from "react";
import {
  Form,
  Input,
  Button,
  message,
  Card,
  Steps,
  Typography,
  Row,
  Col,
  Result,
  Space,
} from "antd";
import {
  MailOutlined,
  UserOutlined,
  PhoneOutlined,
  SafetyOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";

import Link from "next/link";
import styles from "./page.module.css";

const { Title, Text } = Typography;
const { Step } = Steps;

type CurrentStep = "email" | "personal" | "otp" | "success";

interface FormData {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  otp: string;
}

export default function RegisterPage() {
  const [currentStep, setCurrentStep] = useState<CurrentStep>("email");
  const [formData, setFormData] = useState<FormData>({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    otp: "",
  });
  const [loading, setLoading] = useState(false);
  const [emailValid, setEmailValid] = useState<boolean | null>(null);
  const [form] = Form.useForm();

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    setFormData((prev) => ({ ...prev, email }));

    if (email) {
      setEmailValid(validateEmail(email));
    } else {
      setEmailValid(null);
    }
  };

  const handleNextStep = async () => {
    setLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (currentStep === "email") {
      setCurrentStep("personal");
      message.success("Email hợp lệ! Tiếp tục nhập thông tin cá nhân.");
    } else if (currentStep === "personal") {
      setCurrentStep("otp");
      message.success("Mã OTP đã được gửi đến email của bạn!");
    } else if (currentStep === "otp") {
      setCurrentStep("success");
      message.success("Xác thực thành công!");
    }

    setLoading(false);
  };

  const handleBackStep = () => {
    if (currentStep === "personal") {
      setCurrentStep("email");
    } else if (currentStep === "otp") {
      setCurrentStep("personal");
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    message.success("Mã OTP mới đã được gửi!");
    setLoading(false);
  };

  const getStepNumber = () => {
    switch (currentStep) {
      case "email":
        return 0;
      case "personal":
        return 1;
      case "otp":
        return 2;
      default:
        return 3;
    }
  };

  const renderStepIndicator = () => (
    <Steps
      current={getStepNumber()}
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

  const renderEmailStep = () => (
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
          value={formData.email}
          onChange={handleEmailChange}
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

  const renderPersonalStep = () => (
    <div className={styles.stepContent}>
      <Title level={4} className={styles.stepTitle}>
        Thông tin cá nhân
      </Title>
      <Text type="secondary" className={styles.stepDescription}>
        Vui lòng điền đầy đủ thông tin của bạn
      </Text>

      <Row gutter={16} className={styles.personalRow}>
        <Col span={12}>
          <Form.Item
            name="firstName"
            rules={[{ required: true, message: "Vui lòng nhập họ" }]}
          >
            <Input
              placeholder="Nguyễn"
              size="large"
              value={formData.firstName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, firstName: e.target.value }))
              }
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
              value={formData.lastName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, lastName: e.target.value }))
              }
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
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, phone: e.target.value }))
          }
          className={styles.input}
        />
      </Form.Item>
    </div>
  );

  const renderOTPStep = () => (
    <div className={styles.stepContent}>
      <Title level={4} className={styles.stepTitle}>
        Xác thực OTP
      </Title>
      <Text type="secondary" className={styles.stepDescription}>
        Mã xác thực đã được gửi đến <strong>{formData.email}</strong>
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
          value={formData.otp}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              otp: e.target.value.replace(/\D/g, ""),
            }))
          }
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
    </div>
  );

  const renderSuccessStep = () => (
    <Result
      icon={<CheckCircleOutlined className={styles.successIcon} />}
      title="Đăng ký thành công!"
      subTitle="Tài khoản của bạn đã được tạo thành công. Chào mừng bạn đến với dịch vụ của chúng tôi!"
      extra={[
        <Button
          type="primary"
          key="continue"
          onClick={() => window.location.reload()}
        >
          Tiếp tục
        </Button>,
      ]}
    />
  );

  const canProceed = () => {
    switch (currentStep) {
      case "email":
        return formData.email && emailValid;
      case "personal":
        return formData.firstName && formData.lastName && formData.phone;
      case "otp":
        return formData.otp.length === 6;
      default:
        return false;
    }
  };

  if (currentStep === "success") {
    return (
      <div className={styles.container}>
        <Card
          className={styles.card}
          styles={{ body: { padding: "30px 25px" } }}
        >
          {renderSuccessStep()}
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Card className={styles.card} styles={{ body: { padding: "30px 25px" } }}>
        <div className={styles.header}>
          <Title level={2} className={styles.title}>
            Đăng ký tài khoản
          </Title>
          <Text type="secondary" className={styles.subtitle}>
            Tạo tài khoản mới để bắt đầu sử dụng dịch vụ
          </Text>
        </div>

        {renderStepIndicator()}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleNextStep}
          size="large"
        >
          {currentStep === "email" && renderEmailStep()}
          {currentStep === "personal" && renderPersonalStep()}
          {currentStep === "otp" && renderOTPStep()}

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

        <div className={styles.footer}>
          <Text className={styles.footerText}>Đã có tài khoản? </Text>
          <Link href="/login" className={styles.footerLink}>
            Đăng nhập ngay
          </Link>
        </div>
      </Card>
    </div>
  );
}
