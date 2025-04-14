import React, { useState, useEffect, useMemo } from "react";
import { Table, Input, Typography, Space, Tag, Button, Row, Col, Dropdown, Menu, DatePicker } from "antd";
import { SearchOutlined, FilterOutlined, ClockCircleOutlined, UnorderedListOutlined, DownOutlined } from "@ant-design/icons";
import moment from 'moment'; // Import moment
import './Notification.css';

const { Title, Paragraph } = Typography;
const { RangePicker } = DatePicker;

// --- Dữ liệu và hàm định dạng màu giữ nguyên từ trước ---
const initialData = [
  { key: "1", id: "001", type: "Thành công", device: "LED", content: "Thiết bị LED đã được bật", time: "18:55 02/05/2024", },
  { key: "2", id: "002", type: "Thành công", device: "waterpump", content: "Thiết bị waterpump đã được tắt", time: "13:34 02/05/2024", },
  { key: "3", id: "003", type: "Lịch trình", device: "Hệ thống", content: "Thiết bị LED sẽ được tắt theo lịch từ 12:37 đến 12:38", time: "12:38 02/05/2024", },
  { key: "4", id: "004", type: "Cập nhật", device: "LED", content: "Thông tin thiết bị LED đã được cập nhật!", time: "12:36 02/05/2024", },
  { key: "5", id: "005", type: "Cảnh báo", device: "Soil Sensor", content: "Độ ẩm đất thấp, cần kiểm tra.", time: "10:15 12/04/2025", }, // Dữ liệu gần đây hơn
  { key: "6", id: "006", type: "Lỗi", device: "Waterpump", content: "Máy bơm gặp sự cố không hoạt động.", time: "09:00 11/04/2025", }, // Dữ liệu gần đây hơn
  { key: "7", id: "007", type: "Thành công", device: "LED", content: "Bật đèn thành công", time: "20:00 12/04/2025", }, // Dữ liệu hôm qua
];

const getSeverityColorByType = (type) => {
  // ... (giữ nguyên hàm này)
  const lowerCaseType = type.toLowerCase();
  if (lowerCaseType.includes('thành công')) return '#52c41a';
  else if (lowerCaseType.includes('cảnh báo')) return '#faad14';
  else if (lowerCaseType.includes('lỗi')) return '#f5222d';
  else if (lowerCaseType.includes('lịch trình') || lowerCaseType.includes('cập nhật')) return '#1890ff';
  return '#bfbfbf';
};

const columnsConfig = [
   // ... (giữ nguyên config columns)
   { title: "ID", dataIndex: "id", key: "id", align: "center", width: 80, },
   { title: "Type", dataIndex: "type", key: "type", align: "center", width: 150, render: (type) => (<Tag color={getSeverityColorByType(type)} style={{ fontWeight: 500 }}>{type}</Tag>),},
   { title: "Device", dataIndex: "device", key: "device", align: "center", width: 150, },
   { title: "Content", dataIndex: "content", key: "content", align: "left", },
   { title: "Time", dataIndex: "time", key: "time", align: "center", width: 180, },
];
// --- Kết thúc phần giữ nguyên ---


// Hàm parse chuỗi thời gian thành đối tượng moment
// Định dạng đầu vào là "HH:mm DD/MM/YYYY"
const parseDateTimeString = (dateTimeStr) => {
    return moment(dateTimeStr, "HH:mm DD/MM/YYYY", true); // true để parse chặt chẽ theo format
};


const Notification = () => {
  const [searchText, setSearchText] = useState('');
  const [filteredData, setFilteredData] = useState(initialData);
  const [timeFilter, setTimeFilter] = useState('all'); // 'all', 'yesterday', 'last7days', 'custom'
  const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'Thành công', 'Cảnh báo', 'Lỗi', ...
  const [customDateRange, setCustomDateRange] = useState(null); // [moment, moment] or null

  // Lấy danh sách các loại sự kiện duy nhất từ dữ liệu
  const uniqueEventTypes = useMemo(() => {
      const types = initialData.map(item => item.type);
      return ['all', ...new Set(types)]; // Thêm 'all' vào đầu
  }, [initialData]); // Chỉ tính lại khi initialData thay đổi


  // Effect để lọc dữ liệu dựa trên tất cả các bộ lọc
  useEffect(() => {
    let dataAfterFilter = [...initialData]; // Bắt đầu với dữ liệu gốc

    // 1. Lọc theo Search Text
    if (searchText) {
        const lowerCaseValue = searchText.toLowerCase();
        dataAfterFilter = dataAfterFilter.filter(item =>
            item.id.toLowerCase().includes(lowerCaseValue) ||
            item.type.toLowerCase().includes(lowerCaseValue) ||
            item.device.toLowerCase().includes(lowerCaseValue) ||
            item.content.toLowerCase().includes(lowerCaseValue) ||
            item.time.toLowerCase().includes(lowerCaseValue)
        );
    }

    // 2. Lọc theo Loại sự kiện
    if (typeFilter !== 'all') {
        dataAfterFilter = dataAfterFilter.filter(item => item.type === typeFilter);
    }

    // 3. Lọc theo Thời gian
    const today = moment().startOf('day');
    const yesterday = moment().subtract(1, 'days').startOf('day');
    const sevenDaysAgo = moment().subtract(7, 'days').startOf('day');

    if (timeFilter !== 'all') {
        dataAfterFilter = dataAfterFilter.filter(item => {
            const itemDate = parseDateTimeString(item.time);
            if (!itemDate.isValid()) return false; // Bỏ qua nếu ngày không hợp lệ

            switch (timeFilter) {
                case 'yesterday':
                    // So sánh ngày, bỏ qua giờ
                    return itemDate.isSame(yesterday, 'day');
                case 'last7days':
                    // Từ 7 ngày trước đến hôm nay
                    return itemDate.isBetween(sevenDaysAgo, today, 'day', '[]'); // '[]' bao gồm cả ngày bắt đầu và kết thúc
                case 'custom':
                    if (customDateRange && customDateRange[0] && customDateRange[1]) {
                        const startDate = customDateRange[0].startOf('day');
                        const endDate = customDateRange[1].endOf('day');
                        return itemDate.isBetween(startDate, endDate, 'day', '[]');
                    }
                    return true; // Nếu chưa chọn range thì coi như không lọc
                default:
                    return true;
            }
        });
    }

    setFilteredData(dataAfterFilter);

  }, [searchText, typeFilter, timeFilter, customDateRange, initialData]); // Chạy lại khi filter thay đổi


  // Handler cho Dropdown Thời gian
  const handleTimeMenuClick = (e) => {
    const key = e.key;
    if (key === 'custom') {
        // Để người dùng chọn RangePicker, không set state ngay
        // Có thể reset customDateRange ở đây nếu muốn
        setTimeFilter('custom'); // Đánh dấu là đang chọn custom range
    } else {
        setTimeFilter(key); // 'all', 'yesterday', 'last7days'
        setCustomDateRange(null); // Reset custom range khi chọn các option khác
    }
  };

  // Handler cho Dropdown Loại sự kiện
  const handleTypeMenuClick = (e) => {
    setTypeFilter(e.key); // key chính là type ('all', 'Thành công', ...)
  };

  // Handler khi chọn xong RangePicker
  const handleDateRangeChange = (dates) => {
      // dates là mảng [moment, moment] hoặc null
      setCustomDateRange(dates);
      if(dates) {
        setTimeFilter('custom'); // Đảm bảo timeFilter là 'custom' khi range được chọn
      } else if (timeFilter === 'custom') {
          // Nếu người dùng xóa range và filter đang là custom, quay về 'all'
          setTimeFilter('all');
      }
  };


  // Tạo Menu cho Dropdown Thời gian
  const timeMenu = (
    <Menu onClick={handleTimeMenuClick} selectedKeys={[timeFilter]}>
      <Menu.Item key="all">Tất cả thời gian</Menu.Item>
      <Menu.Item key="yesterday">Hôm qua ({moment().subtract(1, 'days').format('DD/MM')})</Menu.Item>
      <Menu.Item key="last7days">7 ngày gần đây</Menu.Item>
      <Menu.Divider />
      {/* Mục Custom chỉ để hiển thị RangePicker, không cần key */}
      <Menu.Item key="custom" disabled>
         <RangePicker
            value={customDateRange}
            onChange={handleDateRangeChange}
            style={{ width: '100%' }}
            allowClear // Cho phép xóa range đã chọn
          />
      </Menu.Item>
    </Menu>
  );

  // Tạo Menu cho Dropdown Loại sự kiện
  const typeMenu = (
    <Menu onClick={handleTypeMenuClick} selectedKeys={[typeFilter]}>
      {uniqueEventTypes.map(type => (
        <Menu.Item key={type}>
          {type === 'all' ? 'Tất cả loại' : type}
        </Menu.Item>
      ))}
    </Menu>
  );


  return (
    <div className="notification-page-container">
      <div className="notification-header">
         <img src="..\src\assets\images\Bg.jpg" alt="Notification background" className="notification-header-bg"/>
         <div className="notification-header-content">
            <Title level={2} style={{ color: '#fff', marginBottom: 8 }}>Notifications History</Title>
            <Paragraph style={{ color: 'rgba(255, 255, 255, 0.85)', maxWidth: 600 }}>
               Review your past notifications to stay updated on important alerts and system activities.
            </Paragraph>
         </div>
      </div>

      <div className="notification-body-content">
          {/* Hàng Search và Filter */}
          <Row gutter={[16, 16]} align="middle" style={{ marginBottom: 24 }}>
            <Col flex="auto">
              <Input
                placeholder="Tìm kiếm ID, Type, Device, Content, Time..."
                prefix={<SearchOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)} // Chỉ cập nhật state search
                allowClear
                style={{ borderRadius: 6 }}
                size="large"
              />
            </Col>
            <Col>
              <Space>
                {/* Dropdown Thời gian */}
                <Dropdown overlay={timeMenu} trigger={['click']}>
                  <Button>
                    <ClockCircleOutlined /> {
                        timeFilter === 'all' ? 'Thời gian' :
                        timeFilter === 'yesterday' ? 'Hôm qua' :
                        timeFilter === 'last7days' ? '7 ngày gần đây' :
                        customDateRange ? `${customDateRange[0].format('DD/MM')} - ${customDateRange[1].format('DD/MM')}` : 'Tùy chỉnh'
                    } <DownOutlined />
                  </Button>
                </Dropdown>

                {/* Dropdown Loại sự kiện */}
                <Dropdown overlay={typeMenu} trigger={['click']}>
                  <Button>
                    <UnorderedListOutlined /> {typeFilter === 'all' ? 'Loại sự kiện' : typeFilter} <DownOutlined />
                  </Button>
                </Dropdown>
                {/* Nút Filter By có thể bỏ đi hoặc dùng cho mục đích khác */}
                {/* <Button icon={<FilterOutlined />}>Filter By</Button> */}
              </Space>
            </Col>
          </Row>

          {/* Bảng dữ liệu */}
          <Table
            columns={columnsConfig}
            dataSource={filteredData} // dataSource là dữ liệu đã được lọc bởi useEffect
            pagination={{ pageSize: 5, showSizeChanger: false, position: ["bottomCenter"] }}
            bordered={false}
            className="notification-table"
            rowKey="key"
            loading={false} // Có thể thêm state loading nếu lọc mất thời gian
          />
      </div>
    </div>
  );
};

export default Notification;