import { useState, useEffect } from "react";
import { Card, Form, Input, Button, Tabs, Spin, Divider, message, Typography } from "antd";
import { UserOutlined, MailOutlined, PhoneOutlined, HomeOutlined, LockOutlined } from "@ant-design/icons";
import { useAuth } from "../../context/AuthContext";
import UserServices from "../../services/UserServices";

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const ProfileSettings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  useEffect(() => {
    if (user) {
      // Pre-fill the form with user data
      profileForm.setFieldsValue({
        fullname: user.fullname || "",
        username: user.username || "",
        email: user.email || "",
        phone: user.phone || "",
        address: user.address || ""
      });
    }
  }, [user, profileForm]);

  const handleUpdateProfile = async (values) => {
    // Remove username from values since we don't want to update it
    const { username, ...updateData } = values;
    
    setSaving(true);
    try {
      await UserServices.updateUserProfile(updateData);
      message.success("Thông tin cá nhân đã được cập nhật thành công!");
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async (values) => {
    const { currentPassword, newPassword, confirmPassword } = values;
    
    if (newPassword !== confirmPassword) {
      message.error("Mật khẩu mới và xác nhận mật khẩu không khớp");
      return;
    }
    
    setSaving(true);
    try {
      await UserServices.updateUserPassword(currentPassword, newPassword);
      passwordForm.resetFields();
    } catch (error) {
      console.error("Error updating password:", error);
    } finally {
      setSaving(false);
    }
  };
  
  if (!user) {
    return (
      <div className="flex justify-center items-center h-full">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <Title level={2} className="mb-6">Cài đặt tài khoản</Title>
      
      <Tabs defaultActiveKey="profile" className="bg-white rounded-lg shadow">
        <TabPane tab="Thông tin cá nhân" key="profile">
          <Card title="Thông tin người dùng" className="mb-6">
            <Form
              form={profileForm}
              layout="vertical"
              onFinish={handleUpdateProfile}
              initialValues={{
                fullname: user.fullname || "",
                username: user.username || "",
                email: user.email || "",
                phone: user.phone || "",
                address: user.address || ""
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Form.Item
                  name="fullname"
                  label="Họ và tên"
                  rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
                >
                  <Input prefix={<UserOutlined />} placeholder="Họ và tên" />
                </Form.Item>
                
                <Form.Item
                  name="username"
                  label="Tên đăng nhập"
                >
                  <Input prefix={<UserOutlined />} disabled />
                </Form.Item>
                
                <Form.Item
                  name="email"
                  label="Email"
                  rules={[
                    { required: true, message: 'Vui lòng nhập email' },
                    { type: 'email', message: 'Email không hợp lệ' }
                  ]}
                >
                  <Input prefix={<MailOutlined />} placeholder="Email" />
                </Form.Item>
                
                <Form.Item
                  name="phone"
                  label="Số điện thoại"
                  rules={[{ required: true, message: 'Vui lòng nhập số điện thoại' }]}
                >
                  <Input prefix={<PhoneOutlined />} placeholder="Số điện thoại" />
                </Form.Item>
                
                <Form.Item
                  name="address"
                  label="Địa chỉ"
                  className="md:col-span-2"
                >
                  <Input prefix={<HomeOutlined />} placeholder="Địa chỉ" />
                </Form.Item>
              </div>
              
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={saving}>
                  Cập nhật thông tin
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </TabPane>
        
        <TabPane tab="Đổi mật khẩu" key="password">
          <Card title="Thay đổi mật khẩu" className="mb-6">
            <Form
              form={passwordForm}
              layout="vertical"
              onFinish={handleUpdatePassword}
            >
              <Form.Item
                name="currentPassword"
                label="Mật khẩu hiện tại"
                rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại' }]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu hiện tại" />
              </Form.Item>
              
              <Form.Item
                name="newPassword"
                label="Mật khẩu mới"
                rules={[
                  { required: true, message: 'Vui lòng nhập mật khẩu mới' },
                  { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' }
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu mới" />
              </Form.Item>
              
              <Form.Item
                name="confirmPassword"
                label="Xác nhận mật khẩu mới"
                rules={[
                  { required: true, message: 'Vui lòng xác nhận mật khẩu mới' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('Mật khẩu xác nhận không khớp'));
                    },
                  }),
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="Xác nhận mật khẩu mới" />
              </Form.Item>
              
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={saving}>
                  Cập nhật mật khẩu
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </TabPane>
        
        <TabPane tab="Thông tin tài khoản" key="account">
          <Card className="mb-6">
            <div className="flex flex-col space-y-4">
              <div>
                <Text strong>Mã người dùng:</Text>
                <Text className="ml-2">{user.id}</Text>
              </div>
              
              <div>
                <Text strong>Tên đăng nhập:</Text>
                <Text className="ml-2">{user.username}</Text>
              </div>
              
              <div>
                <Text strong>Vai trò:</Text>
                <Text className="ml-2">{user.role || "Người dùng"}</Text>
              </div>
              
              <div>
                <Text strong>Ngày tạo tài khoản:</Text>
                <Text className="ml-2">
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Không có thông tin"}
                </Text>
              </div>
              
              <div>
                <Text strong>Trạng thái tài khoản:</Text>
                <Text className="ml-2" type={user.isAccepted ? "success" : "danger"}>
                  {user.isAccepted ? "Đã được chấp nhận" : "Đang chờ xét duyệt"}
                </Text>
              </div>
              
            </div>
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default ProfileSettings; 