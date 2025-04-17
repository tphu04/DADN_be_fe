import React from 'react';
import { List, Tag, Button, Tooltip, Empty, Space, Badge } from 'antd';
import { BulbOutlined, DropboxOutlined, InfoCircleOutlined, DeleteOutlined, CheckCircleOutlined, StopOutlined } from '@ant-design/icons';

const ActiveSchedulesList = ({ schedules, onToggle, onDelete }) => {
    if (!schedules || schedules.length === 0) {
        return (
            <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Không có lịch trình nào"
            />
        );
    }

    const formatDays = (days) => {
        if (!days || !Array.isArray(days) || days.length === 0) {
            return 'Không có ngày nào';
        }

        const dayMap = {
            monday: 'Thứ 2',
            tuesday: 'Thứ 3',
            wednesday: 'Thứ 4',
            thursday: 'Thứ 5',
            friday: 'Thứ 6',
            saturday: 'Thứ 7',
            sunday: 'Chủ nhật',
            1: 'Thứ 2',
            2: 'Thứ 3',
            3: 'Thứ 4',
            4: 'Thứ 5',
            5: 'Thứ 6',
            6: 'Thứ 7',
            0: 'Chủ nhật',
        };

        return days.map(day => dayMap[day] || `Ngày ${day}`).join(', ');
    };

    const renderScheduleDetails = (schedule) => {
        if (!schedule) return null;

        const scheduleType = schedule.scheduleType || 'unknown';
        const startTime = schedule.startTime || '00:00';
        const duration = schedule.duration;
        let actionDetails = null;

        if (scheduleType === 'watering') {
            const speed = schedule.speed !== undefined ? schedule.speed : 0;
            actionDetails = (
                <div>
                    <Tag color="blue">Tốc độ máy bơm: {speed}%</Tag>
                    <Tag color="cyan">Thời gian tưới: {duration} phút</Tag>
                </div>
            );
        } else if (scheduleType === 'lighting') {
            actionDetails = (
                <div>
                    <Tag color="orange">Thời gian bật: {startTime}</Tag>
                    <Tag color="purple">Thời gian tắt: {schedule.endTime || '00:00'}</Tag>
                </div>
            );
        }

        let endTime = '00:00';
        if (scheduleType === 'watering' && startTime && typeof duration === 'number') {
            try {
                const [hours, minutes] = startTime.split(':').map(Number);
                const totalMinutes = hours * 60 + minutes + duration;
                const endHours = Math.floor(totalMinutes / 60) % 24;
                const endMinutes = totalMinutes % 60;
                endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
            } catch (error) {
                console.error('Lỗi khi tính toán thời gian kết thúc:', error);
            }
        } else if (scheduleType === 'lighting') {
            endTime = schedule.endTime || '00:00';
        }

        const daysFormatted = formatDays(schedule.days);

        return (
            <List.Item.Meta
                avatar={
                    <Badge dot={schedule.enabled} color="green">
                        <div style={{ fontSize: '24px', marginRight: '8px' }}>
                            {scheduleType === 'watering' ? <DropboxOutlined style={{ color: '#1890ff' }} /> :
                                scheduleType === 'lighting' ? <BulbOutlined style={{ color: '#faad14' }} /> :
                                    <InfoCircleOutlined />}
                        </div>
                    </Badge>
                }
                title={
                    <div>
                        <strong>{schedule.deviceName || `Thiết bị ID: ${schedule.deviceId || 'không xác định'}`}</strong>
                        <div>
                            <Tag color="geekblue">{scheduleType === 'watering' ? 'Lịch tưới nước' : scheduleType === 'lighting' ? 'Lịch chiếu sáng' : scheduleType}</Tag>
                            <Tag color="purple">{daysFormatted}</Tag>
                            {schedule.enabled ? 
                                <Tag icon={<CheckCircleOutlined />} color="success">Đang hoạt động</Tag> : 
                                <Tag icon={<StopOutlined />} color="default">Đã tắt</Tag>
                            }
                        </div>
                    </div>
                }
                description={
                    <div>
                        <div>{scheduleType === 'watering' ? `Thời gian: ${startTime} - ${endTime} (${duration} phút)` : `Bật: ${startTime}, Tắt: ${endTime}`}</div>
                        {actionDetails}
                    </div>
                }
            />
        );
    };

    return (
        <List
            className="active-schedules-list"
            itemLayout="horizontal"
            dataSource={schedules}
            renderItem={schedule => (
                <List.Item
                    style={{
                        opacity: schedule.enabled ? 1 : 0.7,
                        background: schedule.enabled ? 'transparent' : '#f5f5f5',
                        transition: 'all 0.3s ease'
                    }}
                    actions={[
                        <Button
                            key="toggle"
                            type={schedule.enabled ? "primary" : "default"}
                            size="small"
                            onClick={() => onToggle && onToggle(schedule)}
                        >
                            {schedule.enabled ? "Tắt" : "Bật"}
                        </Button>,
                        <Button
                            key="delete"
                            danger
                            size="small"
                            onClick={() => onDelete && onDelete(schedule)}
                        >
                            Xóa
                        </Button>
                    ]}
                >
                    {renderScheduleDetails(schedule)}
                </List.Item>
            )}
        />
    );
};

export default ActiveSchedulesList;