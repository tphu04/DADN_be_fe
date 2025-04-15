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
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [filters, setFilters] = useState(null);

  useEffect(() => {
    fetchNotifications(1);
  }, []);

  const fetchNotifications = async (page = 1, pageSize = 10, filters = null) => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_ENDPOINTS.NOTIFICATIONS.GET_ALL}?page=${page}&limit=${pageSize}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.data && response.data.success) {
        let filteredData = response.data.data;
        
        // Áp dụng bộ lọc ở phía client nếu có
        if (filters && filters.type && filters.type.length > 0) {
          filteredData = filteredData.filter(notification => {
            if (!notification.type) return false;
            
            return filters.type.some(filterValue => 
              notification.type.toUpperCase().includes(filterValue.toUpperCase())
            );
          });
        }
        
        setNotifications(filteredData);
        setPagination({
          current: page,
          pageSize: pageSize,
          total: response.data.pagination?.total || 0
        });
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
    fetchNotifications(pagination.current, pagination.pageSize, filters);
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
        { text: 'Cảnh báo ngưỡng', value: 'THRESHOLD' },
        { text: 'Kết nối', value: 'CONNECTION' },
        { text: 'Máy bơm', value: 'PUMP' },
        { text: 'Đèn', value: 'USER_ACTION' },
        { text: 'Tự động hóa', value: 'AUTOMATION' },
        { text: 'Cập nhật', value: 'UPDATE' },
        { text: 'Khác', value: 'OTHER' },
      ],
      filteredValue: filters?.type || null,
      onFilter: (value, record) => {
        // Trường hợp đặc biệt cho 'Khác'
        if (value === 'OTHER') {
          const standardTypes = ['THRESHOLD', 'CONNECTION', 'PUMP', 'USER_ACTION', 'AUTOMATION', 'UPDATE'];
          return !record.type || !standardTypes.includes(record.type.toUpperCase());
        }
        
        // Xử lý trường hợp type là null hoặc undefined
        if (!record.type) return false;
        
        // Chuyển cả hai giá trị về chữ hoa và so sánh
        return record.type.toUpperCase().includes(value.toUpperCase());
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

      {loading && pagination.current === 1 ? (
        <div className="flex justify-center my-10">
          <Spin size="large" />
        </div>
      ) : notifications.length === 0 ? (
        <Empty
          description={filters && Object.keys(filters).some(key => filters[key]?.length) 
            ? "Không tìm thấy thông báo phù hợp với bộ lọc" 
            : "Không có thông báo nào"}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-x-auto">
          <Table
            columns={columns}
            dataSource={notifications}
            rowKey="id"
            pagination={pagination}
            loading={loading}
            onChange={handleTableChange}
            scroll={{ x: 800 }}
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