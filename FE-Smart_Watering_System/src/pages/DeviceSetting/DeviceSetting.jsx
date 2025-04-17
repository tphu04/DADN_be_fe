import { useState, useEffect, useRef } from "react";
import { Table, Button, Modal, Form, Input, Select, Spin, Popconfirm, message, Tag, Space, Switch, Row, Col, Card, Tooltip, Popover, Divider } from "antd";
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  SettingOutlined, ReloadOutlined, EyeOutlined,
  ExclamationCircleOutlined, MinusCircleOutlined,
  CheckCircleOutlined, CloseCircleOutlined, SyncOutlined
} from "@ant-design/icons";
import axiosInstance from "../../services/CustomizeAxios";
import { Link } from "react-router-dom";
import DeviceServices from "../../services/DeviceServices";
import { useAuth } from "../../context/AuthContext";

const { Option } = Select;
const { TextArea } = Input;

const DeviceSetting = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState("Thêm thiết bị mới");
  const [editingDevice, setEditingDevice] = useState(null);
  const [form] = Form.useForm();
  const { user } = useAuth();
  const [deviceConnectionStatus, setDeviceConnectionStatus] = useState({});
  const [refreshingAll, setRefreshingAll] = useState(false);
  const refreshIntervalRef = useRef(null);
  const [recentlyUpdatedDevices, setRecentlyUpdatedDevices] = useState([]);

  // Fetch danh sách thiết bị khi component mount
  useEffect(() => {
    fetchDevices();

    // Cleanup khi component unmount
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      // Sử dụng getAllDevices thay vì getDevices để lấy tất cả thiết bị
      const result = await DeviceServices.getAllDevices();
      setDevices(result);
    } catch (error) {
      console.error("Error fetching devices:", error);
      message.error("Lỗi khi tải danh sách thiết bị");
    } finally {
      setLoading(false);
    }
  };

  // Kiểm tra trạng thái kết nối của từng thiết bị
  const checkDeviceConnections = async (deviceList) => {
    try {
      // Tạo đối tượng mới để lưu trạng thái kết nối
      const statusObj = {};

      // Duyệt qua danh sách thiết bị để kiểm tra kết nối
      for (const device of deviceList) {
        try {
          // Kiểm tra trạng thái kết nối thông qua API
          const response = await axiosInstance.get(`/devices/${device.id}/mqtt-status`).catch(async () => {
            // Kiểm tra bằng cách lấy thông tin thiết bị
            const deviceDetail = await DeviceServices.getDeviceById(device.id).catch(() => null);

            // Kiểm tra xem thiết bị có nhận được dữ liệu gần đây không
            let hasRecentData = false;

            // 1. Kiểm tra thông qua các feed
            if (deviceDetail && deviceDetail.feed && deviceDetail.feed.length > 0) {
              for (const feed of deviceDetail.feed) {
                // Chỉ tính là kết nối thành công nếu feed có lastValue và updatedAt trong 5 phút gần đây
                if (feed.lastValue && feed.updatedAt) {
                  const lastUpdateTime = new Date(feed.updatedAt);
                  const fiveMinutesAgo = new Date();
                  fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

                  if (lastUpdateTime > fiveMinutesAgo) {
                    hasRecentData = true;
                    console.log(`Feed ${feed.name} có dữ liệu gần đây: ${lastUpdateTime.toLocaleString()}`);
                    break;
                  }
                }
              }
            }

            // 2. Kiểm tra qua lastSeen của thiết bị
            if (!hasRecentData && deviceDetail && deviceDetail.lastSeen) {
              const lastUpdateDate = new Date(deviceDetail.lastSeen);
              const fiveMinutesAgo = new Date();
              fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

              hasRecentData = lastUpdateDate > fiveMinutesAgo;
            }

            return {
              data: {
                success: true,
                data: {
                  isConnected: hasRecentData
                }
              }
            };
          });

          // Kiểm tra phản hồi từ API
          if (response && response.data && response.data.success) {
            // Sử dụng kết quả từ API
            statusObj[device.id] = response.data.data.isConnected;
          } else {
            // Fallback: Kiểm tra dữ liệu thực tế từ các cảm biến
            let hasRecentData = false;

            // Kiểm tra dữ liệu cảm biến dựa trên loại thiết bị
            if (device.deviceType === 'temperature_humidity') {
              const sensorData = await DeviceServices.getTemperatureHumidityData(device.id).catch(() => []);
              if (sensorData && sensorData.length > 0) {
                // Chỉ kiểm tra dữ liệu gần đây (trong 5 phút)
                const latestData = sensorData[0];
                const readingTime = new Date(latestData.readingTime);
                const fiveMinutesAgo = new Date();
                fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

                hasRecentData = readingTime > fiveMinutesAgo;
              }
            } else if (device.deviceType === 'soil_moisture') {
              const sensorData = await DeviceServices.getSoilMoistureData(device.id).catch(() => []);
              if (sensorData && sensorData.length > 0) {
                const latestData = sensorData[0];
                const readingTime = new Date(latestData.readingTime);
                const fiveMinutesAgo = new Date();
                fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

                hasRecentData = readingTime > fiveMinutesAgo;
              }
            } else if (device.deviceType === 'pump_water') {
              const sensorData = await DeviceServices.getPumpWaterData(device.id).catch(() => []);
              if (sensorData && sensorData.length > 0) {
                const latestData = sensorData[0];
                const readingTime = new Date(latestData.readingTime);
                const fiveMinutesAgo = new Date();
                fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

                hasRecentData = readingTime > fiveMinutesAgo;
              }
            } else if (device.deviceType === 'light') {
              const sensorData = await DeviceServices.getLightData(device.id).catch(() => []);
              if (sensorData && sensorData.length > 0) {
                const latestData = sensorData[0];
                const readingTime = new Date(latestData.readingTime);
                const fiveMinutesAgo = new Date();
                fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

                hasRecentData = readingTime > fiveMinutesAgo;
              }
            }

            // Gán trạng thái kết nối dựa trên việc nhận được dữ liệu gần đây
            statusObj[device.id] = hasRecentData;
          }
        } catch (error) {
          console.error(`Error checking device connection for device ${device.id}:`, error);
          // Nếu có lỗi, mặc định là không kết nối
          statusObj[device.id] = false;
        }
      }

      setDeviceConnectionStatus(statusObj);
    } catch (error) {
      console.error("Error checking device connections:", error);
    }
  };

  const showAddModal = () => {
    if (!user || !user.isAccepted) {
      message.error("Tài khoản của bạn chưa được chấp nhận. Vui lòng liên hệ quản trị viên.");
      return;
    }

    setEditingDevice(null);
    setModalTitle("Thêm thiết bị mới");
    form.resetFields();
    setModalVisible(true);
  };

  const showEditModal = (device) => {
    setEditingDevice(device);
    setModalTitle(`Chỉnh sửa thiết bị: ${device.deviceCode}`);

    // Tạo initialValues cho form
    const initialValues = {
      deviceCode: device.deviceCode,
      description: device.description,
      status: device.status
    };

    // Nếu có feed, chuẩn bị dữ liệu feed cho form
    if (device.feed && device.feed.length > 0) {
      // Tạo mảng feeds để đổ dữ liệu vào form
      initialValues.feeds = device.feed.map(feed => ({
        id: feed.id,
        name: feed.name,
        feedKey: feed.feedKey,
        minValue: feed.minValue,
        maxValue: feed.maxValue
      }));
    }

    // Reset form và đặt giá trị mới
    form.resetFields();
    form.setFieldsValue(initialValues);

    console.log('Khởi tạo form với dữ liệu:', JSON.stringify(initialValues, null, 2));
    setModalVisible(true);
  };

  const handleCancel = () => {
    setModalVisible(false);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (editingDevice) {
        console.log('Dữ liệu cập nhật thiết bị:', JSON.stringify(values, null, 2));

        // Sử dụng DeviceServices thay vì gọi axios trực tiếp
        const result = await DeviceServices.updateDevice(editingDevice.id, values);
        if (result.success) {
          message.success(result.message || "Cập nhật thiết bị thành công");
          fetchDevices(); // Cập nhật danh sách thiết bị
          setModalVisible(false);
        } else {
          message.error(result.message || "Cập nhật thiết bị thất bại");
        }
      } else {
        // Verify user is accepted before adding a device
        if (!user || !user.isAccepted) {
          message.error("Tài khoản của bạn chưa được chấp nhận. Vui lòng liên hệ quản trị viên.");
          setModalVisible(false);
          return;
        }

        // Thêm thiết bị mới
        // Đảm bảo mỗi feed có name và feedKey
        if (values.feeds && values.feeds.length > 0) {
          for (const feed of values.feeds) {
            if (!feed.name || !feed.feedKey) {
              message.error("Mỗi feed phải có tên và feedKey");
              return;
            }
          }
        } else {
          message.error("Cần thêm ít nhất một feed cho thiết bị");
          return;
        }

        // Sử dụng DeviceServices.addDevice thay vì gọi axios trực tiếp
        try {
          const result = await DeviceServices.addDevice(values);
          if (result.success) {
            message.success(result.message || "Thêm thiết bị thành công");
            fetchDevices(); // Cập nhật danh sách thiết bị
            setModalVisible(false);
          } else {
            message.error(result.message || "Thêm thiết bị thất bại");
          }
        } catch (apiError) {
          console.error("API Error:", apiError);
          message.error("Lỗi khi thêm thiết bị mới. Vui lòng thử lại sau.");
        }
      }
    } catch (error) {
      console.error("Form submission error:", error);
      message.error("Lỗi khi lưu thông tin thiết bị");
    }
  };

  const handleDelete = async (deviceId) => {
    try {
      const response = await axiosInstance.delete(`/devices/${deviceId}`);
      if (response.data.success) {
        message.success("Xóa thiết bị thành công");

        // Cập nhật danh sách thiết bị
        fetchDevices();

        // Xóa trạng thái kết nối của thiết bị đã xóa
        setDeviceConnectionStatus((prev) => {
          const newStatus = { ...prev };
          delete newStatus[deviceId];
          return newStatus;
        });
      } else {
        message.error(response.data.message || "Xóa thiết bị thất bại");
      }
    } catch (error) {
      console.error("Error deleting device:", error);
      message.error("Lỗi khi xóa thiết bị");
    }
  };

  const columns = [
    {
      title: "Mã thiết bị",
      dataIndex: "deviceCode",
      key: "deviceCode",
    },
    {
      title: "Loại thiết bị",
      dataIndex: "deviceType",
      key: "deviceType",
      render: (type) => {
        let color;
        let text;

        switch (type) {
          case 'temperature_humidity':
            color = 'blue';
            text = 'Nhiệt độ & độ ẩm';
            break;
          case 'soil_moisture':
            color = 'green';
            text = 'Độ ẩm đất';
            break;
          case 'pump_water':
            color = 'cyan';
            text = 'Máy bơm nước';
            break;
          case 'light':
            color = 'gold';
            text = 'Đèn';
            break;
          default:
            color = 'default';
            text = type;
        }

        return <Tag color={color}>{text}</Tag>;
      }
    },
    {
      title: "Mô tả",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
    },
    {
      title: "Thao tác",
      key: "action",
      render: (_, record) => (
        <Space size="small">
          <Link to={`/config/${record.id}`}>
            <Button
              type="primary"
              size="small"
              icon={<SettingOutlined />}
              title="Cài đặt cấu hình"
            />
          </Link>

          <Button
            type="default"
            size="small"
            icon={<EditOutlined />}
            onClick={() => showEditModal(record)}
            title="Chỉnh sửa"
          />

          <Popconfirm
            title="Bạn có chắc muốn xóa thiết bị này?"
            onConfirm={() => handleDelete(record.id)}
            okText="Có"
            cancelText="Không"
          >
            <Button
              type="danger"
              size="small"
              icon={<DeleteOutlined />}
              title="Xóa"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Quản lý thiết bị</h1>
        <div className="flex space-x-2">
          {user && !!user.isAccepted ? (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={showAddModal}
            >
              Thêm thiết bị
            </Button>
          ) : (
            <Tooltip title="Tài khoản của bạn chưa được chấp nhận. Vui lòng liên hệ quản trị viên.">
              <Button
                type="primary"
                icon={<PlusOutlined />}
                disabled
              >
                Thêm thiết bị
              </Button>
            </Tooltip>
          )}
        </div>
      </div>

      {user && !user.isAccepted && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationCircleOutlined className="text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Tài khoản của bạn chưa được chấp nhận. Bạn không thể thêm thiết bị mới cho đến khi được quản trị viên phê duyệt.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-md">
        {loading ? (
          <div className="flex justify-center items-center py-10">
            <Spin size="large" />
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={devices}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: "Không có thiết bị nào" }}
          />
        )}
      </div>

      <Modal
        title={modalTitle}
        open={modalVisible}
        onCancel={handleCancel}
        onOk={handleSubmit}
        okText={editingDevice ? "Cập nhật" : "Thêm mới"}
        cancelText="Hủy"
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          name="deviceForm"
          initialValues={{
            status: "Off",
            feeds: [{}]
          }}
        >
          {!editingDevice && (
            <Form.Item
              name="deviceType"
              label="Loại thiết bị"
              rules={[{ required: true, message: "Vui lòng chọn loại thiết bị" }]}
            >
              <Select placeholder="Chọn loại thiết bị">
                <Option value="temperature_humidity">Cảm biến nhiệt độ & độ ẩm</Option>
                <Option value="soil_moisture">Cảm biến độ ẩm đất</Option>
                <Option value="pump_water">Máy bơm nước</Option>
                <Option value="light">Đèn</Option>
              </Select>
            </Form.Item>
          )}

          <Form.Item
            name="deviceCode"
            label="Mã thiết bị"
            rules={[{ required: true, message: "Vui lòng nhập mã thiết bị" }]}
          >
            <Input placeholder="Nhập mã thiết bị" />
          </Form.Item>

          <Form.Item name="description" label="Mô tả">
            <TextArea rows={4} placeholder="Nhập mô tả về thiết bị (tùy chọn)" />
          </Form.Item>



          {/* Phần chỉnh sửa feeds - hiển thị khi edit thiết bị */}
          {editingDevice && editingDevice.feed && editingDevice.feed.length > 0 && (
            <div className="mb-4">
              <h3 className="text-base font-semibold mb-2">
                Chỉnh sửa feeds của thiết bị
              </h3>
              <Card size="small" className="mb-2">
                <p className="text-sm text-gray-500 mb-1">
                  Chỉnh sửa thông tin feeds của thiết bị.
                </p>
              </Card>

              <Form.List name="feeds">
                {(fields) => (
                  <div className="space-y-4 mt-2">
                    {fields.map((field, index) => (
                      <Card key={field.key} size="small" className="bg-gray-50">
                        <Row gutter={16}>
                          <Col span={11}>
                            <Form.Item
                              label="Tên feed"
                              name={[field.name, 'name']}
                              rules={[{ required: true, message: 'Vui lòng nhập tên feed' }]}
                            >
                              <Input placeholder="Tên feed (Ví dụ: Nhiệt độ)" />
                            </Form.Item>
                          </Col>
                          <Col span={11}>
                            <Form.Item
                              label="FeedKey"
                              name={[field.name, 'feedKey']}
                              rules={[{ required: true, message: 'Vui lòng nhập feedKey' }]}
                            >
                              <Input placeholder="FeedKey (Ví dụ: temperature)" />
                            </Form.Item>
                          </Col>
                        </Row>

                        {/* Hidden field để lưu id của feed */}
                        <Form.Item
                          name={[field.name, 'id']}
                          hidden
                        >
                          <Input />
                        </Form.Item>
                      </Card>
                    ))}
                  </div>
                )}
              </Form.List>
            </div>
          )}

          {/* Phần thêm feeds - chỉ hiển thị khi thêm thiết bị mới */}
          {!editingDevice && (
            <div className="mb-4">
              <h3 className="text-base font-semibold mb-2">
                Danh sách feeds <span className="text-red-500">*</span>
              </h3>
              <Card size="small" className="mb-2">
                <p className="text-sm text-gray-500 mb-1">
                  Mỗi thiết bị cần có ít nhất một feed để nhận dữ liệu từ MQTT.
                </p>
                <p className="text-sm text-gray-500">
                  Ví dụ: Nếu MQTT topic là "username/feeds/temperature",
                  thì feedKey là "temperature"
                </p>
              </Card>

              <Form.List name="feeds" rules={[
                {
                  validator: async (_, feeds) => {
                    if (!feeds || feeds.length < 1) {
                      return Promise.reject(new Error('Cần thêm ít nhất một feed'));
                    }
                    return Promise.resolve();
                  },
                },
              ]}>
                {(fields, { add, remove }, { errors }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => (
                      <Row key={key} gutter={16} align="middle" className="mb-2">
                        <Col span={9}>
                          <Form.Item
                            {...restField}
                            name={[name, 'name']}
                            rules={[{ required: true, message: 'Nhập tên feed' }]}
                            className="mb-0"
                          >
                            <Input placeholder="Tên feed (Ví dụ: Nhiệt độ)" />
                          </Form.Item>
                        </Col>
                        <Col span={9}>
                          <Form.Item
                            {...restField}
                            name={[name, 'feedKey']}
                            rules={[{ required: true, message: 'Nhập feedKey' }]}
                            className="mb-0"
                          >
                            <Input placeholder="FeedKey (Ví dụ: temperature)" />
                          </Form.Item>
                        </Col>
                        <Col span={3}>
                          <Button
                            type="text"
                            danger
                            icon={<MinusCircleOutlined />}
                            onClick={() => {
                              if (fields.length > 1) {
                                remove(name);
                              } else {
                                message.warning('Cần ít nhất một feed');
                              }
                            }}
                          />
                        </Col>
                      </Row>
                    ))}
                    <Form.Item className="mt-2">
                      <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                        Thêm feed
                      </Button>
                      <Form.ErrorList errors={errors} />
                    </Form.Item>
                  </>
                )}
              </Form.List>
            </div>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default DeviceSetting;
