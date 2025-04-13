import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, message, Tag, Spin, Tooltip, Popconfirm, Space } from 'antd';
import { UserOutlined, CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined, EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { getAllUsers, updateUserAccess, isAdmin, getAdminProfile, getAllSystemUsers, createUser, updateUser, deleteUser } from '../../services/AdminServices';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('accept'); // 'accept', 'edit', 'create'
  const [form] = Form.useForm();
  const [selectedUser, setSelectedUser] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    // Validate admin session first
    validateAdminSession();
  }, [navigate]);

  const validateAdminSession = async () => {
    try {
      setLoading(true);
      
      // Check if there's a user in local storage
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        console.log('No user found in localStorage');
        message.error("You need to log in to access this page");
        navigate('/login');
        return;
      }
      
      // Check if user has admin privileges from local storage first
      if (!isAdmin()) {
        console.log('User is not an admin according to localStorage');
        message.error("You don't have permission to access this page.");
        navigate('/dashboard');
        return;
      }
      
      console.log('User appears to be an admin, fetching admin profile from backend');
      
      try {
        // Verify admin session with backend
        await getAdminProfile();
        console.log('Admin profile validated successfully');
        
        // If validated, fetch users
        fetchUsers();
      } catch (error) {
        // Handle specific errors from getAdminProfile
        if (error.response) {
          if (error.response.status === 401) {
            console.error('Token expired or invalid:', error);
            message.error("Your session has expired. Please log in again.");
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            navigate('/login');
          } else if (error.response.status === 403) {
            console.error('Not an admin:', error);
            message.error("You don't have permission to access this page.");
            navigate('/dashboard');
          } else {
            console.error('Backend error:', error);
            message.error(`Server error: ${error.response.data?.message || 'Unknown error'}`);
            // Don't redirect - allow the user to try again
          }
        } else {
          console.error('Network or other error:', error);
          message.error("Can't connect to the server. Please check your internet connection.");
          // Don't redirect - allow the user to try again
        }
      }
    } catch (error) {
      console.error('Error in client-side admin validation:', error);
      message.error("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log('Fetching users from admin dashboard...');
      
      // Get user info from localStorage to debug
      const userFromStorage = localStorage.getItem('user');
      if (userFromStorage) {
        console.log('Current user from storage:', JSON.parse(userFromStorage));
      } else {
        console.warn('No user found in localStorage');
      }
      
      // Get token to verify it exists
      const token = localStorage.getItem('token');
      console.log('Token exists:', !!token);
      
      // Make the API call using the new function to get all users including admins
      const response = await getAllSystemUsers();
      console.log('Full API response:', response);
      
      if (response.success) {
        console.log("Received users count:", response.data?.length || 0);
        setUsers(response.data || []);
        
        if (!response.data || response.data.length === 0) {
          console.log('No users returned from API');
          message.info('No users found in the system');
        }
      } else {
        console.error('API returned error:', response.message);
        message.error(response.message || 'Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users (detailed):', error);
      
      // Check for authentication errors
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        console.error('Authentication error details:', error.response.data);
        message.error("Your session has expired or you don't have permission to view users");
        navigate('/dashboard');
      } else {
        message.error('Failed to fetch users. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const showAcceptModal = (user) => {
    // Don't allow acceptance for admin users
    if (user.isAdmin || user.role === 'ADMIN' || user.userType === 'admin') {
      message.info("Admin users don't need acceptance");
      return;
    }
    
    setSelectedUser(user);
    setModalMode('accept');
    setModalVisible(true);
    form.resetFields();
  };

  const showCreateModal = () => {
    setSelectedUser(null);
    setModalMode('create');
    setModalVisible(true);
    form.resetFields();
  };

  const showEditModal = (user) => {
    // Don't allow editing for admin users
    if (user.isAdmin || user.role === 'ADMIN' || user.userType === 'admin') {
      message.info("Admin users can't be edited here");
      return;
    }
    
    setSelectedUser(user);
    setModalMode('edit');
    setModalVisible(true);
    
    // Set initial values for the form
    form.setFieldsValue({
      fullname: user.fullname,
      username: user.username,
      email: user.email,
      phone: user.phone,
      address: user.address,
      isAccepted: user.isAccepted
    });
  };

  const handleCancel = () => {
    setModalVisible(false);
    setSelectedUser(null);
  };

  const handleUpdateAccess = async (values) => {
    try {
      setLoading(true);
      
      const response = await updateUserAccess(
        selectedUser.id, 
        true
      );
      
      if (response.success) {
        message.success('User accepted successfully');
        
        // Update the local state immediately before fetching fresh data
        setUsers(prevUsers => {
          return prevUsers.map(user => {
            if (user.id === selectedUser.id) {
              // Create updated user object with new access status
              return {
                ...user,
                isAccepted: true
              };
            }
            return user;
          });
        });
        
        // Fetch fresh data from server
        fetchUsers();
        setModalVisible(false);
      } else {
        message.error(response.message || 'Failed to update user');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      
      // Handle authentication errors
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        message.error("Your session has expired or you don't have permission");
        navigate('/dashboard');
      } else {
        message.error('Failed to update user. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (values) => {
    try {
      setLoading(true);
      const response = await createUser(values);
      
      if (response.success) {
        message.success('User created successfully');
        fetchUsers();
        setModalVisible(false);
      } else {
        message.error(response.message || 'Failed to create user');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      
      // Handle authentication errors
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        message.error("Your session has expired or you don't have permission");
        navigate('/dashboard');
      } else {
        message.error('Failed to create user. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = async (values) => {
    try {
      setLoading(true);
      const response = await updateUser(selectedUser.id, values);
      
      if (response.success) {
        message.success('User updated successfully');
        fetchUsers();
        setModalVisible(false);
      } else {
        message.error(response.message || 'Failed to update user');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      
      // Handle authentication errors
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        message.error("Your session has expired or you don't have permission");
        navigate('/dashboard');
      } else {
        message.error('Failed to update user. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      setLoading(true);
      const response = await deleteUser(userId);
      
      if (response.success) {
        message.success('User deleted successfully');
        fetchUsers();
      } else {
        message.error(response.message || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      
      // Handle authentication errors
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        message.error("Your session has expired or you don't have permission");
        navigate('/dashboard');
      } else {
        message.error('Failed to delete user. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDenyAccess = async (userId) => {
    try {
      setLoading(true);
      const response = await updateUserAccess(userId, false);
      
      if (response.success) {
        message.success('User denied successfully');
        fetchUsers();
      } else {
        message.error(response.message || 'Failed to deny user access');
      }
    } catch (error) {
      console.error('Error denying user access:', error);
      
      // Handle authentication errors
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        message.error("Your session has expired or you don't have permission");
        navigate('/dashboard');
      } else {
        message.error('Failed to deny user access. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Username',
      dataIndex: 'username',
      key: 'username',
      render: (text) => <span><UserOutlined /> {text}</span>,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Full Name',
      dataIndex: 'fullname',
      key: 'fullname',
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => {
        if (record.isAdmin || record.role === 'ADMIN' || record.userType === 'admin') {
          return <Tag color="gold">Admin</Tag>;
        }
        return record.isAccepted ? (
          <Tag color="green" icon={<CheckCircleOutlined />}>Accepted</Tag>
        ) : (
          <Tag color="red" icon={<CloseCircleOutlined />}>Pending</Tag>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => {
        // Don't show action buttons for admin users
        if (record.isAdmin || record.role === 'ADMIN' || record.userType === 'admin') {
          return <span>No actions available</span>;
        }
        
        return (
          <Space>
            {!record.isAccepted ? (
              <Button 
                type="primary" 
                onClick={() => showAcceptModal(record)}
              >
                Accept
              </Button>
            ) : (
              <Tooltip title="Revoke Access">
                <Button 
                  danger
                  onClick={() => {
                    Modal.confirm({
                      title: 'Are you sure you want to revoke access?',
                      icon: <ExclamationCircleOutlined />,
                      content: 'This will prevent the user from accessing the system.',
                      onOk() {
                        handleDenyAccess(record.id);
                      },
                    });
                  }}
                >
                  Revoke
                </Button>
              </Tooltip>
            )}
            
            <Button
              type="default"
              icon={<EditOutlined />}
              onClick={() => showEditModal(record)}
            >
              Edit
            </Button>
            
            <Popconfirm
              title="Are you sure you want to delete this user?"
              onConfirm={() => handleDeleteUser(record.id)}
              okText="Yes"
              cancelText="No"
              icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
            >
              <Button
                danger
                icon={<DeleteOutlined />}
              >
                Delete
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  let modalTitle = 'Accept User';
  if (modalMode === 'edit') modalTitle = 'Edit User';
  if (modalMode === 'create') modalTitle = 'Create New User';

  const renderModalContent = () => {
    if (modalMode === 'accept') {
      // Accept user form
      return (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleUpdateAccess}
        >
          {selectedUser && (
            <div style={{ marginBottom: '20px' }}>
              <p><strong>Username:</strong> {selectedUser.username}</p>
              <p><strong>Email:</strong> {selectedUser.email}</p>
            </div>
          )}
          
          <p>Accepting this user will grant them access to the system.</p>
        </Form>
      );
    } else if (modalMode === 'edit') {
      // Edit user form
      return (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleEditUser}
        >
          <Form.Item
            name="fullname"
            label="Full Name"
            rules={[{ required: true, message: 'Please input full name!' }]}
          >
            <Input />
          </Form.Item>
          
          <Form.Item
            name="username"
            label="Username"
            rules={[{ required: true, message: 'Please input username!' }]}
          >
            <Input />
          </Form.Item>
          
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please input email!' },
              { type: 'email', message: 'Please input a valid email!' }
            ]}
          >
            <Input />
          </Form.Item>
          
          <Form.Item
            name="phone"
            label="Phone"
            rules={[{ required: true, message: 'Please input phone number!' }]}
          >
            <Input />
          </Form.Item>
          
          <Form.Item
            name="address"
            label="Address"
            rules={[{ required: true, message: 'Please input address!' }]}
          >
            <Input />
          </Form.Item>
        </Form>
      );
    } else if (modalMode === 'create') {
      // Create user form
      return (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateUser}
        >
          <Form.Item
            name="fullname"
            label="Full Name"
            rules={[{ required: true, message: 'Please input full name!' }]}
          >
            <Input />
          </Form.Item>
          
          <Form.Item
            name="username"
            label="Username"
            rules={[{ required: true, message: 'Please input username!' }]}
          >
            <Input />
          </Form.Item>
          
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please input email!' },
              { type: 'email', message: 'Please input a valid email!' }
            ]}
          >
            <Input />
          </Form.Item>
          
          <Form.Item
            name="phone"
            label="Phone"
            rules={[{ required: true, message: 'Please input phone number!' }]}
          >
            <Input />
          </Form.Item>
          
          <Form.Item
            name="address"
            label="Address"
            rules={[{ required: true, message: 'Please input address!' }]}
          >
            <Input />
          </Form.Item>
          
          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: 'Please input password!' }]}
          >
            <Input.Password />
          </Form.Item>
          
          <Form.Item
            name="isAccepted"
            valuePropName="checked"
          >
            <input type="checkbox" /> Accept user immediately
          </Form.Item>
        </Form>
      );
    }
    
    return null;
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>User Management</h1>
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
          <p>Loading user data...</p>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
            <Button type="primary" onClick={fetchUsers}>
              Refresh User List
            </Button>
            
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={showCreateModal}
            >
              Create New User
            </Button>
          </div>
          
          <Table 
            columns={columns} 
            dataSource={users.map(user => ({ ...user, key: user.id }))} 
            rowKey="id" 
            pagination={{ pageSize: 10 }}
          />
          
          <Modal
            title={modalTitle}
            visible={modalVisible}
            onCancel={handleCancel}
            footer={[
              <Button key="cancel" onClick={handleCancel}>
                Cancel
              </Button>,
              <Button 
                key="submit" 
                type="primary" 
                onClick={() => form.submit()}
                loading={loading}
              >
                {modalMode === 'accept' ? 'Accept' : modalMode === 'edit' ? 'Update' : 'Create'}
              </Button>,
            ]}
          >
            {renderModalContent()}
          </Modal>
        </>
      )}
    </div>
  );
};

export default UserManagement; 