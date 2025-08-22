"use client";
import React from "react";
import { Card, Typography } from "antd";
import Link from "next/link";
import { LoginForm } from "@/features/login";
import styles from "./page.module.css";

const { Title, Text } = Typography;

export default function LoginPage() {
  return (
    <div className={styles.container}>
      <Card className={styles.card} styles={{ body: { padding: "30px 25px" } }}>
        <div className={styles.header}>
          <Title level={2} className={styles.title}>
            Đăng nhập
          </Title>
          <Text type="secondary" className={styles.subtitle}>
            Nhập thông tin để tiếp tục
          </Text>
        </div>

        <LoginForm />

        <div className={styles.footer}>
          <Text className={styles.footerText}>Chưa có tài khoản? </Text>
          <Link href="/register" className={styles.footerLink}>
            Đăng ký ngay
          </Link>
        </div>
      </Card>
    </div>
  );
}


