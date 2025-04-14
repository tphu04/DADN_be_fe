import React, { useState, useEffect } from 'react'; // Thêm useEffect
// Giữ nguyên các import Ant Design
import { Row, Col, Avatar, Typography, Button, Input, Form, message, Modal, Switch } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import './ProfileSettings.css'; // Giữ lại CSS

const { Title, Text, Paragraph } = Typography;

const ProfileSettings = () => {
    // --- State ---
    const [userData, setUserData] = useState({
        // Nên lấy dữ liệu này từ API hoặc Context khi component mount
        id: 1, // Giả sử có ID
        name: 'John Doe',
        username: 'johndoe',
        email: 'john.doe@example.com',
        phone: '0123456789',
        address: '123 Example St, City',
        avatarUrl: '../src/assets/images/avt.jpeg', // <-- Kiểm tra đường dẫn
    });

    // Form hooks
    const [passwordForm] = Form.useForm(); // Form cho đổi mật khẩu
    const [infoForm] = Form.useForm();     // Form cho sửa thông tin

    // Modal states
    const [isInfoModalVisible, setIsInfoModalVisible] = useState(false);       // Modal sửa thông tin

    // --- Handlers ---

    // Mở Modal sửa thông tin
    const showInfoModal = () => {
        // Đặt giá trị ban đầu cho form trong modal dựa trên state userData hiện tại
        infoForm.setFieldsValue({
            fullname: userData.name,
            username: userData.username,
            email: userData.email,
            phone: userData.phone,
            address: userData.address,
        });
        setIsInfoModalVisible(true);
    };

    // Xử lý khi submit form sửa thông tin thành công
    const onFinishUpdateInfo = (values) => {
        console.log('Received values from info modal: ', values);
        // !!! Thêm logic gọi API cập nhật thông tin user ở đây !!!
        // Giả sử API thành công:
        message.success('Profile information updated successfully!');
        // Cập nhật lại state userData nếu cần (hoặc fetch lại)
        setUserData(prev => ({ ...prev, name: values.fullname, ...values }));
        setIsInfoModalVisible(false); // Đóng modal
        // Xử lý lỗi API nếu có
    };

    const handleInfoModalCancel = () => {
        setIsInfoModalVisible(false);
        // Không cần reset form vì lần sau mở sẽ set lại giá trị
    };

     const handleInfoModalOk = () => {
        // Trigger submit form info
        infoForm.submit();
    };


    // Xử lý khi submit form đổi mật khẩu thành công
    const onFinishChangePassword = (values) => {
        console.log('Received values from change password form: ', values);
        // !!! Thêm logic gọi API đổi mật khẩu ở đây !!!
        // API cần nhận: values.currentPassword, values.newPassword
        // Ví dụ: apiService.changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword })
        // Giả sử API thành công:
        message.success('Password updated successfully!');
        passwordForm.resetFields(); // Xóa các trường trong form
        // Không cần đóng modal vì form nằm ngoài
        // Xử lý lỗi API nếu có
    };

    const onFinishChangePasswordFailed = (errorInfo) => {
        console.log('Change password validation Failed:', errorInfo);
    };

    // --- Kết thúc Handlers ---

    return (
        <div className="profile-settings-page-container">
            {/* Header giữ nguyên */}
            <div className="profile-settings-header">
                 <img src="../src/assets/images/avt.jpeg" alt="Profile Settings background" className="profile-settings-header-bg" />
                 <div className="profile-settings-header-content">
                    <Title level={2} style={{ color: '#fff', marginBottom: 8 }}>Profile Settings</Title>
                    <Paragraph style={{ color: 'rgba(255, 255, 255, 0.85)', maxWidth: 600 }}>
                        Manage your profile details, notification preferences, and account security.
                    </Paragraph>
                 </div>
            </div>

            <div className="profile-settings-body-content">
                {/* Khôi phục layout 2 cột */}
                <Row gutter={[32, 32]}>
                    {/* Cột trái: Chỉ còn Thông tin User */}
                    <Col xs={24} md={14} lg={16}>
                        <div className="user-info-section">
                             <Avatar size={64} src={userData.avatarUrl} icon={!userData.avatarUrl ? <UserOutlined /> : null} />
                             <div className="user-details">
                                <Title level={4} style={{ marginBottom: 0 }}>{userData.name}</Title>
                                {/* Có thể hiển thị thêm email hoặc username ở đây */}
                                <Text type="secondary">{userData.email}</Text>
                             </div>
                             {/* Nút này giờ mở modal sửa thông tin */}
                             <Button type="primary" onClick={showInfoModal}>
                                Update Information
                             </Button>
                        </div>
                        {/* Bỏ khối Notification Toggle ở đây */}
                        {/* <div className="notification-toggle-section"> ... </div> */}
                    </Col>

                    {/* Cột phải: Khôi phục Change Password */}
                    <Col xs={24} md={10} lg={8}>
                        <div className="change-password-section">
                            <Title level={4}>Change Password</Title>
                            <Paragraph type="secondary" style={{ marginBottom: '24px' }}>
                                Update your current password.
                            </Paragraph>
                            {/* Form đổi mật khẩu đặt lại ở đây */}
                            <Form
                                form={passwordForm}
                                name="change_password_main" // Đổi tên form
                                onFinish={onFinishChangePassword}
                                onFinishFailed={onFinishChangePasswordFailed}
                                layout="vertical"
                                requiredMark={false}
                            >
                                {/* Thêm trường Mật khẩu hiện tại */}
                                <Form.Item
                                    name="currentPassword"
                                    label="Current Password"
                                    rules={[{ required: true, message: 'Please input your current password!' }]}
                                    hasFeedback
                                >
                                    <Input.Password placeholder="Enter your current password" />
                                </Form.Item>
                                <Form.Item
                                    name="newPassword"
                                    label="New Password"
                                    rules={[{ required: true, message: 'Please input your new password!' }, { min: 6, message: 'Password must be at least 6 characters!' }]}
                                    hasFeedback
                                >
                                    <Input.Password placeholder="Enter new password" />
                                </Form.Item>
                                <Form.Item
                                    name="confirmPassword"
                                    label="Confirm New Password"
                                    dependencies={['newPassword']}
                                    hasFeedback
                                    rules={[{ required: true, message: 'Please confirm your new password!' }, ({ getFieldValue }) => ({ validator(_, value) { if (!value || getFieldValue('newPassword') === value) { return Promise.resolve(); } return Promise.reject(new Error('The two passwords do not match!')); }, }),]}
                                >
                                    <Input.Password placeholder="Re-enter new password" />
                                </Form.Item>
                                <Form.Item style={{ marginBottom: 0 }}>
                                    <Button type="primary" htmlType="submit" block>
                                        Update Password
                                    </Button>
                                </Form.Item>
                            </Form>
                        </div>
                    </Col>
                </Row>
            </div>

            {/* Modal sửa thông tin */}
            <Modal
                title="Update Profile Information"
                visible={isInfoModalVisible}
                onOk={handleInfoModalOk} // Trigger submit form info
                onCancel={handleInfoModalCancel}
                confirmLoading={false} // Thêm state loading nếu gọi API lâu
                destroyOnClose={true}
                maskClosable={false}
            >
                 <Form
                    form={infoForm}
                    name="update_info_modal"
                    onFinish={onFinishUpdateInfo} // Handler riêng cho form này
                    layout="vertical"
                 >
                    <Form.Item name="fullname" label="Full Name" rules={[{ required: true, message: 'Please input your full name!' }]}>
                        <Input placeholder="Enter your full name"/>
                    </Form.Item>
                     <Form.Item name="username" label="Username" rules={[{ required: true, message: 'Please input your username!' }]}>
                        <Input placeholder="Enter your username" />
                    </Form.Item>
                    <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Please input your email!' }, { type: 'email', message: 'Please enter a valid email!' }]}>
                        <Input placeholder="Enter your email address"/>
                    </Form.Item>
                     <Form.Item name="phone" label="Phone Number" rules={[{ required: true, message: 'Please input your phone number!' }]}>
                        <Input placeholder="Enter your phone number"/>
                    </Form.Item>
                     <Form.Item name="address" label="Address">
                        <Input.TextArea rows={3} placeholder="Enter your address (optional)" />
                    </Form.Item>
                 </Form>
            </Modal>
        </div>
    );
};

export default ProfileSettings;