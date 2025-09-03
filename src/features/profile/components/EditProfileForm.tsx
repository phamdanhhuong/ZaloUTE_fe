import React from "react";
import { Form, Input, Button, Space } from "antd";
import { SaveOutlined, CloseOutlined } from "@ant-design/icons";
import { UpdateProfileRequest } from "../service";
import { LoginUser } from "@/features/auth/login/service";

interface EditProfileFormProps {
  user: LoginUser;
  onSave: (data: UpdateProfileRequest) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export const EditProfileForm: React.FC<EditProfileFormProps> = ({
  user,
  onSave,
  onCancel,
  loading = false,
}) => {
  const [form] = Form.useForm();

  const handleSubmit = async (values: UpdateProfileRequest) => {
    try {
      await onSave(values);
      // Form sẽ được reset và edit mode sẽ tự động tắt sau khi save thành công
    } catch (error) {
      // Error handling đã được xử lý trong hook
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      initialValues={{
        firstname: user.firstname,
        lastname: user.lastname,
        phone: user.phone,
        email: user.email,
      }}
      style={{ width: "100%" }}
    >
      <Form.Item
        label="Họ"
        name="firstname"
        rules={[
          { required: true, message: "Vui lòng nhập họ" },
          { min: 1, message: "Họ phải có ít nhất 1 ký tự" },
          { max: 50, message: "Họ không được quá 50 ký tự" },
        ]}
      >
        <Input placeholder="Nhập họ" />
      </Form.Item>

      <Form.Item
        label="Tên"
        name="lastname"
        rules={[
          { required: true, message: "Vui lòng nhập tên" },
          { min: 1, message: "Tên phải có ít nhất 1 ký tự" },
          { max: 50, message: "Tên không được quá 50 ký tự" },
        ]}
      >
        <Input placeholder="Nhập tên" />
      </Form.Item>

      <Form.Item
        label="Số điện thoại"
        name="phone"
        rules={[
          { required: true, message: "Vui lòng nhập số điện thoại" },
          {
            pattern: /^[0-9]{10,11}$/,
            message: "Số điện thoại phải có 10-11 chữ số",
          },
        ]}
      >
        <Input placeholder="Nhập số điện thoại" />
      </Form.Item>

      <Form.Item
        label="Email"
        name="email"
        rules={[
          { required: true, message: "Vui lòng nhập email" },
          { type: "email", message: "Email không hợp lệ" },
          { max: 100, message: "Email không được quá 100 ký tự" },
        ]}
      >
        <Input placeholder="Nhập email" />
      </Form.Item>

      <Form.Item style={{ marginBottom: 0 }}>
        <Space style={{ width: "100%", justifyContent: "flex-end" }}>
          <Button
            type="default"
            icon={<CloseOutlined />}
            onClick={onCancel}
            disabled={loading}
          >
            Hủy
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            htmlType="submit"
            loading={loading}
          >
            Lưu thay đổi
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
};

export default EditProfileForm;

