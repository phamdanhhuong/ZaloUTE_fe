"use client";
import React, { useState } from "react";
import { Card, Typography } from "antd";
import Link from "next/link";
import { RegisterForm, SuccessStep } from "@/features/auth/register/components";
import { CurrentStep } from "@/features/auth/hooks";
import styles from "./page.module.css";

const { Title, Text } = Typography;

export default function RegisterPage() {
  const [currentStep, setCurrentStep] = useState<CurrentStep>("email");

  const handleStepChange = (step: CurrentStep) => {
    setCurrentStep(step);
  };

  if (currentStep === "success") {
    return (
      <div className={styles.container}>
        <Card
          className={styles.card}
          styles={{ body: { padding: "30px 25px" } }}
        >
          <SuccessStep />
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

        <RegisterForm onStepChange={handleStepChange} />

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
