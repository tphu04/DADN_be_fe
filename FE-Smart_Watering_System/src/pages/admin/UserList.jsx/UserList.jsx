import React, { useState } from "react";
import { Table, Input, Typography, Space, Button, Tag, Switch } from "antd";
import { SearchOutlined } from "@ant-design/icons";

const { Title } = Typography;

const initialData = [
  {
    key: "1",
    id: 1,
    fullname: "test",
    username: "1",
    email: "q@gmail.com",
    phone: "123",
    createdAt: "2025-04-12 16:47:02",
    status: "Premium",
  },
  {
    key: "2",
    id: 2,
    fullname: "2",
    username: "2",
    email: "2@gmail.com",
    phone: "2",
    createdAt: "2025-04-12 10:57:17",
    status: "Free",
  },
];

const UserList = () => {
  const [data, setData] = useState(initialData);

  const handleToggle = (key) => {
    const newData = data.map((user) => {
      if (user.key === key) {
        const newStatus = user.status === "Premium" ? "Free" : "Premium";

        // Optional: Make API call here
        // axios.put('/api/update-status', { id: user.id, status: newStatus })

        return { ...user, status: newStatus };
      }
      return user;
    });
    setData(newData);
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      align: "center",
    },
    {
      title: "Full Name",
      dataIndex: "fullname",
      key: "fullname",
      align: "left",
    },
    {
      title: "Username",
      dataIndex: "username",
      key: "username",
      align: "left",
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      align: "left",
    },
    {
      title: "Phone",
      dataIndex: "phone",
      key: "phone",
      align: "center",
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      align: "center",
    },
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
        User List
      </Title>

      <Input
        placeholder="Search users"
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

export default UserList;
