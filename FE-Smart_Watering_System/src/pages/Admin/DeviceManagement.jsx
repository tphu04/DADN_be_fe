import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Tag, Space, Spin, Divider, Row, Col } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, ExclamationCircleOutlined, SyncOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  getAllDevices, 
  createDevice, 
  updateDevice, 
  deleteDevice, 
  getAdminProfile
} from '../../services/AdminServices';
import DeviceServices from '../../services/DeviceServices'; // Import DeviceServices for activation

const { Option } = Select;
const { confirm } = Modal;

const deviceTypes = [
  { value: 'temperature_humidity', label: 'Temperature & Humidity' },
  { value: 'soil_moisture', label: 'Soil Moisture' },
  { value: 'pump_water', label: 'Water Pump' },
  { value: 'light', label: 'Light' }
];

const DeviceManagement = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deviceModalVisible, setDeviceModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [deviceForm] = Form.useForm();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    // Validate admin session first
    validateAdminSession();
  }, [navigate]);

  const validateAdminSession = async () => {
    try {
      setLoading(true);
      
      // Verify admin session with backend
      await getAdminProfile();
      console.log('Admin profile validated successfully');
      
      // If validated, fetch devices and users
      await fetchData();
    } catch (error) {
      handleAuthError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthError = (error) => {
    if (error?.response) {
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
        message.error(`Server error: ${error.response?.data?.message || 'Unknown error'}`);
      }
    } else {
      console.error('Network or other error:', error);
      message.error("Can't connect to the server. Please check your internet connection.");
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch devices
      const devicesResponse = await getAllDevices();
      if (devicesResponse?.success) {
        const deviceData = devicesResponse.data || [];
        setDevices(deviceData);
      } else {
        console.error('Failed to fetch devices:', devicesResponse);
        message.error(devicesResponse?.message || 'Failed to fetch devices');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      handleAuthError(error);
    } finally {
      setLoading(false);
    }
  };

  // Device Modal Functions
  const showCreateDeviceModal = () => {
    setSelectedDevice(null);
    setModalMode('create');
    deviceForm.resetFields();
    setDeviceModalVisible(true);
  };

  const showEditDeviceModal = (device) => {
    if (!device) {
      message.error("Cannot edit: Device data is invalid");
      return;
    }
    
    setSelectedDevice(device);
    setModalMode('edit');
    
    // Create form values with basic device info
    const formValues = {
      deviceCode: device.deviceCode || '',
      deviceType: device.deviceType || '',
      description: device.description || ''
    };
    
    // Add feed data if available
    if (device.feed && Array.isArray(device.feed) && device.feed.length > 0) {
      formValues.feeds = device.feed.map(feed => ({
        name: feed.name,
        feedKey: feed.feedKey,
        id: feed.id
      }));
    } else {
      // Initialize with empty feed if no feeds exist
      formValues.feeds = [{}];
    }
    
    deviceForm.setFieldsValue(formValues);
    setDeviceModalVisible(true);
  };

  const handleDeviceModalCancel = () => {
    setDeviceModalVisible(false);
  };

  const handleDeviceSubmit = async (values) => {
    try {
      if (!values) {
        message.error("Form data is invalid");
        return;
      }
      
      setLoading(true);
      let response;
      
      // Create a copy of values
      const deviceData = { ...values };
      
      // Validate feeds array
      if (!deviceData.feeds || !Array.isArray(deviceData.feeds) || deviceData.feeds.length === 0) {
        message.error("At least one feed is required");
        setLoading(false);
        return;
      }
      
      // Validate each feed has name and feedKey
      const invalidFeeds = deviceData.feeds.filter(feed => !feed.name || !feed.feedKey);
      if (invalidFeeds.length > 0) {
        message.error("Each feed must have a name and feed key");
        setLoading(false);
        return;
      }
      
      if (modalMode === 'create') {
        response = await createDevice(deviceData);
        
        // If device was created successfully, activate it
        if (response?.success && response?.data?.device?.id) {
          message.loading("Activating device...", 2);
          const deviceId = response.data.device.id;
          
          setTimeout(async () => {
            try {
              const activationResult = await DeviceServices.activateDevice(deviceId);
              if (activationResult.success) {
                message.success("Device activated successfully");
              } else {
                message.warning("Device created but activation failed. Please activate manually.");
              }
            } catch (activationError) {
              console.error("Error activating device:", activationError);
              message.warning("Device created but activation failed. Please activate manually.");
            }
          }, 2000); // Delay activation to ensure device is saved in DB
        }
      } else if (selectedDevice && selectedDevice.id) {
        response = await updateDevice(selectedDevice.id, deviceData);
      } else {
        throw new Error("Cannot update: Missing device ID");
      }
      
      if (response?.success) {
        message.success(modalMode === 'create' ? 'Device created successfully' : 'Device updated successfully');
        setDeviceModalVisible(false);
        fetchData();
      } else {
        message.error(response?.message || `Failed to ${modalMode} device`);
      }
    } catch (error) {
      console.error(`Error ${modalMode}ing device:`, error);
      handleAuthError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDevice = (deviceId) => {
    if (!deviceId) {
      message.error("Cannot delete: Missing device ID");
      return;
    }
    
    confirm({
      title: 'Are you sure you want to delete this device?',
      icon: <ExclamationCircleOutlined />,
      content: 'This action cannot be undone. All device data will be permanently removed.',
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'No',
      onOk: async () => {
        try {
          setLoading(true);
          const response = await deleteDevice(deviceId);
          
          if (response?.success) {
            message.success('Device deleted successfully');
            fetchData();
          } else {
            message.error(response?.message || 'Failed to delete device');
          }
        } catch (error) {
          console.error('Error deleting device:', error);
          handleAuthError(error);
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // Function to handle device activation
  const handleActivateDevice = async (deviceId) => {
    try {
      setLoading(true);
      message.loading("Activating device...", 2);
      
      const activationResult = await DeviceServices.activateDevice(deviceId);
      
      if (activationResult.success) {
        message.success("Device activated successfully");
        fetchData(); // Refresh the device list
      } else {
        message.error(activationResult.message || "Failed to activate device");
      }
    } catch (error) {
      console.error('Error activating device:', error);
      handleAuthError(error);
    } finally {
      setLoading(false);
    }
  };

  // Columns for the devices table
  const deviceColumns = [
    {
      title: 'Device Code',
      dataIndex: 'deviceCode',
      key: 'deviceCode',
      render: text => text || 'N/A'
    },
    {
      title: 'Device Type',
      dataIndex: 'deviceType',
      key: 'deviceType',
      render: (type) => {
        if (!type) return 'N/A';
        const deviceType = deviceTypes.find(t => t.value === type);
        return deviceType ? deviceType.label : type;
      }
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: text => text || 'N/A'
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button 
            icon={<EditOutlined />} 
            onClick={() => showEditDeviceModal(record)}
            type="primary"
            disabled={!record || !record.id}
          >
            Edit
          </Button>
          <Button 
            icon={<DeleteOutlined />} 
            onClick={() => handleDeleteDevice(record?.id)}
            danger
            disabled={!record || !record.id}
          >
            Delete
          </Button>
          <Button
            icon={<SyncOutlined />}
            onClick={() => handleActivateDevice(record?.id)}
            disabled={!record || !record.id}
          >
            Activate
          </Button>
        </Space>
      )
    }
  ];

  // Kiểm tra key duy nhất cho mỗi record trước khi render
  const getDeviceKey = (device) => {
    return device && device.id ? `device-${device.id}` : `device-${Math.random()}`;
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Device Management</h1>
      
      {loading && !devices.length ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
          <p>Loading data...</p>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={showCreateDeviceModal}
              style={{ marginRight: '10px' }}
            >
              Add Device
            </Button>
            <Button onClick={fetchData}>Refresh</Button>
          </div>
          
          <Table 
            columns={deviceColumns} 
            dataSource={Array.isArray(devices) ? devices.map(device => ({ ...device, key: getDeviceKey(device) })) : []} 
            rowKey={record => getDeviceKey(record)} 
            loading={loading}
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: 'No devices found' }}
          />
        </div>
      )}
          
      {/* Device Modal */}
      <Modal
        title={modalMode === 'create' ? 'Add New Device' : 'Edit Device'}
        open={deviceModalVisible}
        onCancel={handleDeviceModalCancel}
        footer={[
          <Button key="cancel" onClick={handleDeviceModalCancel}>
            Cancel
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            onClick={() => deviceForm.submit()}
            loading={loading}
          >
            {modalMode === 'create' ? 'Create' : 'Update'}
          </Button>,
        ]}
      >
        <Form
          form={deviceForm}
          layout="vertical"
          onFinish={handleDeviceSubmit}
        >
          <Form.Item
            name="deviceCode"
            label="Device Code"
            rules={[
              { required: true, message: 'Please enter the device code' },
              { min: 3, message: 'Device code must be at least 3 characters' }
            ]}
          >
            <Input placeholder="Enter device code" disabled={modalMode === 'edit'} />
          </Form.Item>
          
          <Form.Item
            name="deviceType"
            label="Device Type"
            rules={[{ required: true, message: 'Please select the device type' }]}
          >
            <Select placeholder="Select device type">
              {deviceTypes.map(type => (
                <Option key={type.value} value={type.value}>{type.label}</Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="description"
            label="Description"
          >
            <Input.TextArea placeholder="Enter device description" />
          </Form.Item>

          <Divider orientation="left">Feed Information</Divider>
          <Form.List name="feeds" initialValue={[{}]}>
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <div key={key} style={{ marginBottom: 20 }}>
                    <Row gutter={16}>
                      <Col span={11}>
                        <Form.Item
                          {...restField}
                          name={[name, "name"]}
                          label="Feed Name"
                          rules={[{ required: true, message: "Please enter feed name" }]}
                        >
                          <Input placeholder="Enter feed name" />
                        </Form.Item>
                      </Col>
                      <Col span={11}>
                        <Form.Item
                          {...restField}
                          name={[name, "feedKey"]}
                          label="Feed Key"
                          rules={[{ required: true, message: "Please enter feed key" }]}
                        >
                          <Input placeholder="Enter feed key" />
                        </Form.Item>
                      </Col>
                      <Col span={2} style={{ display: 'flex', alignItems: 'center', marginTop: 30 }}>
                        {fields.length > 1 && (
                          <DeleteOutlined 
                            style={{ color: '#ff4d4f' }}
                            onClick={() => remove(name)}
                          />
                        )}
                      </Col>
                    </Row>
                    {fields.length > 1 && <Divider dashed />}
                  </div>
                ))}
                <Form.Item>
                  <Button
                    type="dashed"
                    onClick={() => add()}
                    block
                    icon={<PlusOutlined />}
                  >
                    Add Feed
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>
    </div>
  );
};

export default DeviceManagement; 