import { useState, useEffect } from "react";
import { Empty, Table, Tag, Spin, Button, Tooltip, Space, Typography } from "antd";
import { BellOutlined, ExclamationCircleOutlined, CheckCircleOutlined, InfoCircleOutlined, ToolOutlined, ApiOutlined } from "@ant-design/icons";
import axios from "axios";
import API_ENDPOINTS from "../../services/ApiEndpoints";
import { toast } from "react-toastify";

const { Text } = Typography;

const Notification = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async (filters = null) => {
    try {
      setLoading(true);
      
      // Log the filter being applied for debugging
      console.log("Applying filters:", filters);
      
      // Lấy tất cả thông báo không phân trang
      const response = await axios.get(
        `${API_ENDPOINTS.NOTIFICATIONS.GET_ALL}?limit=1000`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.data && response.data.success) {
        let filteredData = response.data.data;
        
        console.log("Data before filtering:", filteredData);
        
        // Áp dụng bộ lọc ở phía client nếu có
        if (filters && filters.type && filters.type.length > 0) {
          filteredData = filteredData.filter(notification => {
            // Log each notification's type for debugging
            console.log("Notification type:", notification.type, "Filters:", filters.type);
            
            if (!notification.type) {
              // Xử lý trường hợp đặc biệt cho "Khác"
              return filters.type.includes('OTHER');
            }
            
            // Trim whitespace and convert to uppercase for case-insensitive comparison
            const normalizedType = notification.type.trim().toUpperCase();
            return filters.type.some(filter => filter.toUpperCase() === normalizedType);
          });
        }
        
        console.log("Data after filtering:", filteredData);
        
        setNotifications(filteredData);
      } else {
        throw new Error(response.data?.message || "Không thể tải thông báo");
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
      toast.error("Không thể tải thông báo: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleTableChange = (pagination, filters, sorter) => {
    console.log("Table changed:", { pagination, filters, sorter });
    setFilters(filters);
    fetchNotifications(filters);
  };

  // Get icon for notification type
  const getTypeIcon = (type) => {
    switch (type?.toUpperCase()) {
      case 'THRESHOLD':
        return <ExclamationCircleOutlined style={{ color: '#f5222d' }} />;
      case 'CONNECTION':
        return <ApiOutlined style={{ color: '#1890ff' }} />;
      case 'PUMP':
        return <ToolOutlined style={{ color: '#52c41a' }} />;
      case 'USER_ACTION':
        return <CheckCircleOutlined style={{ color: '#722ed1' }} />;
      case 'AUTOMATION':
        return <ToolOutlined style={{ color: '#fa8c16' }} />;
      default:
        return <InfoCircleOutlined style={{ color: '#1890ff' }} />;
    }
  };

  // Get tag color for notification type
  const getTypeColor = (type) => {
    switch (type?.toUpperCase()) {
      case 'THRESHOLD':
        return 'error';
      case 'CONNECTION':
        return 'processing';
      case 'PUMP':
        return 'success';
      case 'USER_ACTION':
        return 'purple';
      case 'AUTOMATION':
        return 'warning';
      case 'UPDATE':
        return 'cyan';
      default:
        return 'default';
    }
  };

  // Define table columns
  const columns = [
    {
      title: 'Loại',
      dataIndex: 'type',
      key: 'type',
      width: 150,
      render: (type) => (
        <Tag icon={getTypeIcon(type)} color={getTypeColor(type)}>
          {type || 'UNKNOWN'}
        </Tag>
      ),
      filters: [
        { text: 'THRESHOLD', value: 'THRESHOLD' },
        { text: 'CONNECTION', value: 'CONNECTION' },
        { text: 'PUMP', value: 'PUMP' },
        { text: 'LIGHT', value: 'USER_ACTION' },
        { text: 'AUTOMATION', value: 'AUTOMATION' },
        { text: 'UPDATE', value: 'UPDATE' },
        { text: 'OTHER', value: 'OTHER' },
      ],
      filteredValue: filters?.type || null,
      onFilter: (value, record) => {
        // Trường hợp đặc biệt cho 'Khác'
        if (value === 'OTHER') {
          return !record.type;
        }
        
        // Xử lý trường hợp type là null hoặc undefined
        if (!record.type) return false;
        
        // Trim whitespace and convert to uppercase for case-insensitive comparison
        const normalizedType = record.type.trim().toUpperCase();
        return value.toUpperCase() === normalizedType;
      },
    },
    {
      title: 'Nội dung',
      dataIndex: 'message',
      key: 'message',
      render: (text) => <Text>{text}</Text>,
    },
    {
      title: 'Thiết bị',
      dataIndex: 'source',
      key: 'source',
      width: 150,
      render: (source, record) => (
        <span>{source || (record.iotdevice?.deviceCode || 'N/A')}</span>
      ),
    },
    {
      title: 'Giá trị',
      dataIndex: 'value',
      key: 'value',
      width: 100,
      render: (value) => {
        if (!value) return <span>-</span>;
        
        // Try to parse JSON if it's a JSON string
        try {
          const jsonValue = JSON.parse(value);
          // return <Tooltip title={<pre>{JSON.stringify(jsonValue, null, 2)}</pre>}>
          //   <Button type="link" size="small">Chi tiết</Button>
          // </Tooltip>;
          return <span>{jsonValue}</span>;
        } catch (e) {
          return <span>{value}</span>;
        }
      },
    },
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
      defaultSortOrder: 'descend',
      render: (timestamp) => (
        <Tooltip title={new Date(timestamp).toLocaleString()}>
          {new Date(timestamp).toLocaleDateString() + ' ' + new Date(timestamp).toLocaleTimeString()}
        </Tooltip>
      ),
    }
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-8 text-center">
        Thông báo của bạn
      </h1>

      {loading ? (
        <div className="flex justify-center my-10">
          <Spin size="large" />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-x-auto">
          <Table
            columns={columns}
            dataSource={notifications}
            rowKey="id"
            pagination={false} // Tắt phân trang
            loading={loading}
            onChange={handleTableChange}
            scroll={{ x: 800, y: 600 }} // Thêm scroll chiều dọc
            locale={{ 
              filterConfirm: 'Lọc',
              filterReset: 'Đặt lại',
              emptyText: filters && Object.keys(filters).some(key => filters[key]?.length)
                ? "Không tìm thấy thông báo phù hợp với bộ lọc"
                : "Không có thông báo nào"
            }}
          />
        </div>
      )}
    </div>
  );
};

export default Notification; 