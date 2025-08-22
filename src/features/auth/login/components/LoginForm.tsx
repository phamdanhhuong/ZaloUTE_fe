"use client";
import React from "react";
import { Button, Form, Input } from "antd";
import { useLogin } from "../hooks/useLogin";

export const LoginForm: React.FC = () => {
  const [form] = Form.useForm();
  const { loading, handleLogin } = useLogin();

  const onFinish = async (values: { identifier: string; password: string }) => {
    await handleLogin(values);
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
      requiredMark={false}
    >
      <Form.Item
        label="Email hoặc Username"
        name="identifier"
        rules={[{ required: true, message: "Vui lòng nhập email hoặc username" }]}
      >
        <Input placeholder="vd: email@example.com" />
      </Form.Item>

      <Form.Item
        label="Mật khẩu"
        name="password"
        rules={[{ required: true, message: "Vui lòng nhập mật khẩu" }]}
      >
        <Input.Password placeholder="Nhập mật khẩu" />
      </Form.Item>

      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          loading={loading}
          style={{ width: "100%", borderRadius: 8 }}
        >
          Đăng nhập
        </Button>
      </Form.Item>
    </Form>
  );
};

export default LoginForm;


