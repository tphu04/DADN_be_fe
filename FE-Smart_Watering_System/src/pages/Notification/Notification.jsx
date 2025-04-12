import React from "react";
import { Table, Input, Typography, Space, Tag, Button } from "antd";
import { SearchOutlined } from "@ant-design/icons";

const { Title } = Typography;

const data = [
  {
    key: "1",
    id: "001", // Thêm ID
    type: "Thành công",
    device: "LED",
    content: "Thiết bị LED đã được bật",
    time: "18:55 02/05/2024",
  },
  {
    key: "2",
    id: "002", // Thêm ID
    type: "Thành công",
    device: "waterpump",
    content: "Thiết bị waterpump đã được tắt",
    time: "13:34 02/05/2024",
  },
  {
    key: "3",
    id: "003", // Thêm ID
    type: "Thành công",
    device: "Hệ thống",
    content: "Thiết bị LED sẽ được tắt theo lịch từ 12:37 đến 12:38",
    time: "12:38 02/05/2024",
  },
  {
    key: "4",
    id: "004", // Thêm ID
    type: "Thành công",
    device: "LED",
    content: "Thông tin thiết bị LED đã được cập nhật!",
    time: "12:36 02/05/2024",
  },
];

const columns = [
  {
    title: "ID", // Thêm tiêu đề cho cột ID
    dataIndex: "id", // Trỏ đến dữ liệu ID trong mỗi đối tượng
    key: "id",
    align: "center",
  },
  {
    title: "Type",
    dataIndex: "type",
    key: "type",
    align: "center",
    render: () => (
      <Space>
        <span
          style={{
            display: "inline-block",
            width: 10,
            height: 10,
            backgroundColor: "#52c41a",
            borderRadius: "50%",
          }}
        ></span>
        Thành công
      </Space>
    ),
  },
  {
    title: "Device",
    dataIndex: "device",
    key: "device",
    align: "center",
  },
  {
    title: "Content",
    dataIndex: "content",
    key: "content",
    align: "left",
  },
  {
    title: "Time",
    dataIndex: "time",
    key: "time",
    align: "center",
  },
];

const Notification = () => {
  return (
    <div
      style={{
        padding: 30,
        borderRadius: 16,
        background: "#fff",
        boxShadow: "0 8px 24px rgba(0,0,0,0.05)",
        margin: "auto",
        maxWidth: 1200,
      }}
    >
      <Title level={3} style={{ marginBottom: 24 }}>
        Notification
      </Title>

      <Input
        placeholder="Search"
        prefix={<SearchOutlined />}
        style={{
          width: 300,
          marginBottom: 20,
          borderRadius: 8,
          padding: "6px 12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        }}
      />

      <Table
        columns={columns}
        dataSource={data}
        pagination={{
          pageSize: 5,
          showSizeChanger: false,
          position: ["bottomCenter"],
          nextIcon: <Button type="default">Next</Button>,
          prevIcon: <Button type="default">Previous</Button>,
        }}
        bordered={false}
        style={{ borderRadius: 12 }}
      />
    </div>
  );
};

export default Notification;
