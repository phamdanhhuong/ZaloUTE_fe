"use client";

import React from "react";
import { Layout, Breadcrumb } from "antd";
import { UserOutlined, HomeOutlined } from "@ant-design/icons";

const { Content } = Layout;

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Layout style={{ minHeight: "100vh", background: "#f0f2f5" }}>
      <Content style={{ padding: "20px" }}>
        <Breadcrumb
          style={{ marginBottom: "16px" }}
          items={[
            {
              href: "/",
              title: (
                <>
                  <HomeOutlined />
                  <span>Trang chủ</span>
                </>
              ),
            },
            {
              title: (
                <>
                  <UserOutlined />
                  <span>Hồ sơ cá nhân</span>
                </>
              ),
            },
          ]}
        />
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>{children}</div>
      </Content>
    </Layout>
  );
}
