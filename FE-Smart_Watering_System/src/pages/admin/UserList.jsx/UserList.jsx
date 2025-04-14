import React, { useState, useEffect, useMemo } from "react"; // Thêm useEffect, useMemo
import { Table, Input, Typography, Space, Button, Tag, Switch, Row, Col, Dropdown, Menu, DatePicker } from "antd"; // Thêm Row, Col, Dropdown, Menu, DatePicker
import { SearchOutlined, ClockCircleOutlined, UnorderedListOutlined, DownOutlined } from "@ant-design/icons"; // Thêm các icons cần thiết
import moment from 'moment'; // Import moment

import '../../Notification/Notification.css'; 
const { Title, Paragraph } = Typography; // Thêm Paragraph
const { RangePicker } = DatePicker; // Thêm RangePicker

// Dữ liệu mẫu
const initialData = [
    // Dữ liệu UserList của bạn
    { key: "1", id: 1, fullname: "test", username: "1", email: "q@gmail.com", phone: "123", createdAt: "2025-04-12 16:47:02", status: "Premium", },
    { key: "2", id: 2, fullname: "User Free", username: "freeuser", email: "free@gmail.com", phone: "987", createdAt: "2025-04-11 10:57:17", status: "Free", },
    { key: "3", id: 3, fullname: "Alice Premium", username: "alicep", email: "alice@premium.com", phone: "555", createdAt: "2025-04-13 08:30:00", status: "Premium", }, // Dữ liệu hôm qua
    { key: "4", id: 4, fullname: "Bob Seven", username: "bob7", email: "bob@7days.com", phone: "777", createdAt: "2025-04-08 15:00:00", status: "Free", }, // Dữ liệu 7 ngày trước
    { key: "5", id: 1, fullname: "test2", username: "1", email: "q@gmail.com", phone: "123", createdAt: "2025-04-12 16:47:02", status: "Premium", },
    { key: "6", id: 2, fullname: "User Free2", username: "freeuser", email: "free@gmail.com", phone: "987", createdAt: "2025-04-11 10:57:17", status: "Free", }
];

// Hàm parse chuỗi thời gian (giữ nguyên từ Notification)
// !!! QUAN TRỌNG: Định dạng 'createdAt' của bạn là 'YYYY-MM-DD HH:mm:ss'
// Cần sửa lại hàm parse cho đúng định dạng này
const parseDateTimeString = (dateTimeStr) => {
    // return moment(dateTimeStr, "HH:mm DD/MM/YYYY", true); // Format cũ của Notification
    return moment(dateTimeStr, "YYYY-MM-DD HH:mm:ss", true); // Format mới cho UserList
};


const UserList = () => {
    // --- State từ Notification ---
    const [searchText, setSearchText] = useState('');
    const [filteredData, setFilteredData] = useState(initialData);
    const [timeFilter, setTimeFilter] = useState('all'); // 'all', 'yesterday', 'last7days', 'custom'
    // Đổi tên typeFilter thành statusFilter
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'Premium', 'Free'
    const [customDateRange, setCustomDateRange] = useState(null); // [moment, moment] or null
    // --------------------------

    // State data gốc không cần nữa nếu dùng filteredData
    // const [data, setData] = useState(initialData);

    // Lấy danh sách các trạng thái duy nhất từ dữ liệu
    const uniqueStatuses = useMemo(() => {
        const statuses = initialData.map(item => item.status);
        return ['all', ...new Set(statuses)]; // Thêm 'all' vào đầu
    }, [initialData]); // Chỉ tính lại khi initialData thay đổi (nếu dữ liệu là động)

    // Toggle status (cập nhật trên filteredData)
    const handleToggle = (key) => {
        const newData = filteredData.map((user) => {
          if (user.key === key) {
            const newStatus = user.status === "Premium" ? "Free" : "Premium";
            // Gọi API ở đây nếu cần
            return { ...user, status: newStatus };
          }
          return user;
        });
        setFilteredData(newData);
        // Lưu ý: Cần cơ chế cập nhật lại initialData hoặc fetch lại nếu muốn thay đổi bền vững
      };

    // --- Effect lọc dữ liệu từ Notification (đã chỉnh sửa) ---
    useEffect(() => {
        let dataAfterFilter = [...initialData];

        // 1. Lọc theo Search Text (cập nhật trường tìm kiếm)
        if (searchText) {
            const lowerCaseValue = searchText.toLowerCase();
            dataAfterFilter = dataAfterFilter.filter(item =>
                item.id.toString().includes(lowerCaseValue) ||
                item.fullname.toLowerCase().includes(lowerCaseValue) ||
                item.username.toLowerCase().includes(lowerCaseValue) ||
                item.email.toLowerCase().includes(lowerCaseValue) ||
                (item.phone && item.phone.toLowerCase().includes(lowerCaseValue)) ||
                item.status.toLowerCase().includes(lowerCaseValue) ||
                item.createdAt.toLowerCase().includes(lowerCaseValue) // Search cả chuỗi ngày tạo
            );
        }

        // 2. Lọc theo Trạng thái (Status)
        if (statusFilter !== 'all') {
            dataAfterFilter = dataAfterFilter.filter(item => item.status === statusFilter);
        }

        // 3. Lọc theo Thời gian (dựa trên createdAt)
        const today = moment().startOf('day');
        const yesterday = moment().subtract(1, 'days').startOf('day');
        const sevenDaysAgo = moment().subtract(7, 'days').startOf('day');

        if (timeFilter !== 'all') {
            dataAfterFilter = dataAfterFilter.filter(item => {
                const itemDate = parseDateTimeString(item.createdAt); // Sử dụng hàm parse đã sửa
                if (!itemDate.isValid()) return false;

                switch (timeFilter) {
                    case 'yesterday':
                        return itemDate.isSame(yesterday, 'day');
                    case 'last7days':
                        return itemDate.isBetween(sevenDaysAgo, today, 'day', '[]');
                    case 'custom':
                        if (customDateRange && customDateRange[0] && customDateRange[1]) {
                            const startDate = customDateRange[0].startOf('day');
                            const endDate = customDateRange[1].endOf('day');
                            return itemDate.isBetween(startDate, endDate, 'day', '[]');
                        }
                        return true;
                    default:
                        return true;
                }
            });
        }

        setFilteredData(dataAfterFilter);

    }, [searchText, statusFilter, timeFilter, customDateRange, initialData]);
    // ----------------------------------------------------


    // --- Handlers từ Notification (đã đổi tên type thành status) ---
    const handleTimeMenuClick = (e) => {
        const key = e.key;
        if (key === 'custom') {
            setTimeFilter('custom');
        } else {
            setTimeFilter(key);
            setCustomDateRange(null);
        }
    };

    const handleStatusMenuClick = (e) => { // Đổi tên thành handleStatusMenuClick
        setStatusFilter(e.key); // Cập nhật statusFilter
    };

    const handleDateRangeChange = (dates) => {
        setCustomDateRange(dates);
        if(dates) {
          setTimeFilter('custom');
        } else if (timeFilter === 'custom') {
            setTimeFilter('all');
        }
    };
    // -------------------------------------------------------


    // --- Menus từ Notification (đã đổi tên type thành status) ---
    const timeMenu = (
        <Menu onClick={handleTimeMenuClick} selectedKeys={[timeFilter]}>
          <Menu.Item key="all">Tất cả thời gian</Menu.Item>
          <Menu.Item key="yesterday">Hôm qua ({moment().subtract(1, 'days').format('DD/MM')})</Menu.Item>
          <Menu.Item key="last7days">7 ngày gần đây</Menu.Item>
          <Menu.Divider />
          <Menu.Item key="custom" disabled style={{ padding: 0, cursor: 'default' }}> {/* Style để không bị hiệu ứng hover */}
               <RangePicker
                 value={customDateRange}
                 onChange={handleDateRangeChange}
                 style={{ width: '100%', border: 'none', boxShadow: 'none' }} // Bỏ viền để trông liền mạch
                 allowClear
               />
          </Menu.Item>
        </Menu>
      );

      const statusMenu = (
        <Menu onClick={handleStatusMenuClick} selectedKeys={[statusFilter]}>
          {uniqueStatuses.map(status => ( // Dùng uniqueStatuses
            <Menu.Item key={status}>
              {status === 'all' ? 'Tất cả trạng thái' : status}
            </Menu.Item>
          ))}
        </Menu>
      );
    // ------------------------------------------------------

    const columns = [
        { title: "ID", dataIndex: "id", key: "id", align: "center", },
        { title: "Full Name", dataIndex: "fullname", key: "fullname", align: "left", },
        { title: "Username", dataIndex: "username", key: "username", align: "left", },
        { title: "Email", dataIndex: "email", key: "email", align: "left", },
        { title: "Phone", dataIndex: "phone", key: "phone", align: "center", },
        { title: "Created At", dataIndex: "createdAt", key: "createdAt", align: "center", },
        {
            title: "Account Status",
            dataIndex: "status",
            key: "status",
            align: "center",
            render: (status, record) => (
                <Space>
                    <Tag color={status === "Premium" ? "gold" : "blue"}>{status}</Tag>
                    <Switch
                        checked={status === "Premium"}
                        onChange={() => handleToggle(record.key)}
                        size="small"
                    />
                </Space>
            ),
        },
    ];
    // ---------------------------------------


    return (
        <div className="notification-page-container">
            {/* Header giữ nguyên */}
            <div className="notification-header">
                <img src="..\src\assets\images\Bg.jpg" alt="User List background" className="notification-header-bg"/>
                <div className="notification-header-content">
                    <Title level={2} style={{ color: '#fff', marginBottom: 8 }}>User Management</Title>
                    <Paragraph style={{ color: 'rgba(255, 255, 255, 0.85)', maxWidth: 600 }}>
                        View, search, and manage user accounts and statuses.
                    </Paragraph>
                </div>
            </div>

            <div className="notification-body-content">
                {/* --- Hàng Search và Filter lấy từ Notification (đã sửa) --- */}
                <Row gutter={[16, 16]} align="middle" style={{ marginBottom: 24 }}>
                    <Col flex="auto">
                        <Input
                            placeholder="Search ID, Name, Username, Email, Phone, Status..."
                            prefix={<SearchOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
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
                                    timeFilter === 'all' ? 'Created Time' : // Đổi chữ
                                    timeFilter === 'yesterday' ? 'Hôm qua' :
                                    timeFilter === 'last7days' ? '7 ngày gần đây' :
                                    customDateRange ? `${customDateRange[0].format('DD/MM')} - ${customDateRange[1].format('DD/MM')}` : 'Tùy chỉnh'
                                } <DownOutlined />
                              </Button>
                            </Dropdown>

                            {/* Dropdown Trạng thái (Status) */}
                            <Dropdown overlay={statusMenu} trigger={['click']}>
                              <Button>
                                <UnorderedListOutlined /> {statusFilter === 'all' ? 'Account Status' : statusFilter} <DownOutlined />
                              </Button>
                            </Dropdown>
                        </Space>
                    </Col>
                </Row>
                {/* ----------------------------------------------------- */}

                {/* Bảng dữ liệu */}
                <Table
                    columns={columns}
                    dataSource={filteredData} // Sử dụng dữ liệu đã lọc
                    pagination={{ pageSize: 5, showSizeChanger: false, position: ["bottomCenter"] }}
                    bordered={false}
                    className="notification-table" // Dùng class chung hoặc đổi tên nếu cần
                    rowKey="key"
                    scroll={{ x: 'max-content' }}
                />
            </div>
        </div>
    );
};

export default UserList;