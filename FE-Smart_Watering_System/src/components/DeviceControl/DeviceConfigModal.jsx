import React from 'react';
import { Card, Button, Switch, Form, Input, Select } from 'antd';
import { ScheduleOutlined, BulbOutlined } from '@ant-design/icons';

const { Option } = Select;

const DeviceConfigModal = ({
    device,
    config,
    onClose,
    onAutoModeChange,
    onScheduleChange,
    onSave,
    saving,
    disabled
}) => {
    const isWateringDevice = device?.deviceType === 'pump_water';
    const isLightDevice = device?.deviceType === 'light';
    
    // Helper function to handle schedule field changes
    const handleScheduleFieldChange = (scheduleType, field, value) => {
        console.log(`Changing ${scheduleType}.${field} to:`, value);
        onScheduleChange(scheduleType, field, value);
    };

    return (
        <Card
            title={`Cấu hình lịch trình: ${device?.deviceCode} (${isWateringDevice ? 'Máy bơm' : 'Đèn'})`}
            extra={<Button type="link" onClick={onClose} disabled={saving}>Đóng</Button>}
            className="mb-6 shadow-md"
        >
            <div className="flex justify-between items-center mb-4">
                <div>
                    <div className="text-lg font-semibold">Chế độ điều khiển</div>
                    <div className="text-sm text-gray-500">Chọn cách bạn muốn điều khiển thiết bị</div>
                </div>
                <div className="flex items-center">
                    <span className="mr-2">Thủ công</span>
                    <Switch
                        checked={config.autoMode}
                        onChange={onAutoModeChange}
                        className={config.autoMode ? "bg-green-500" : ""}
                        disabled={disabled || saving}
                    />
                    <span className="ml-2">Tự động</span>
                </div>
            </div>

            <div className="bg-blue-50 p-3 rounded border border-blue-200 mb-4">
                <div className="font-medium text-blue-700 mb-1">Chế độ tự động:</div>
                <div className="text-blue-600 text-sm">
                    Khi bật chế độ tự động, hệ thống sẽ tự động điều chỉnh thiết bị dựa trên lịch trình.
                    Bạn cần bật chế độ tự động và bật ít nhất một lịch trình bên dưới, sau đó nhấn "Lưu lịch trình" để hoàn tất.
                </div>
            </div>

            {/* Cấu hình cho máy bơm */}
            {isWateringDevice && (
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <div className="font-medium text-lg"><ScheduleOutlined /> Lịch trình tưới nước</div>
                            <div className="text-sm text-gray-500">Thiết lập thời gian tưới nước tự động</div>
                        </div>
                        <Switch
                            checked={config.wateringSchedule.enabled}
                            onChange={(val) => handleScheduleFieldChange("wateringSchedule", "enabled", val)}
                            className={config.wateringSchedule.enabled ? "bg-blue-500" : ""}
                            disabled={!config.autoMode || disabled || saving}
                        />
                    </div>

                    {!config.autoMode && (
                        <div className="text-red-600 text-sm bg-red-50 p-2 rounded mb-4">
                            Vui lòng bật chế độ tự động để sử dụng lịch trình.
                        </div>
                    )}

                    <Form layout="vertical" disabled={!config.autoMode || !config.wateringSchedule.enabled || disabled || saving}>
                        <Form.Item label="Thời gian bắt đầu">
                            <Input
                                type="time"
                                value={config.wateringSchedule.startTime}
                                onChange={(e) => handleScheduleFieldChange("wateringSchedule", "startTime", e.target.value)}
                            />
                        </Form.Item>

                        <Form.Item label="Thời gian tưới (phút)">
                            <Input
                                type="number"
                                min={1}
                                max={60}
                                value={config.wateringSchedule.duration}
                                onChange={(e) => handleScheduleFieldChange("wateringSchedule", "duration", Number(e.target.value))}
                            />
                        </Form.Item>

                        <Form.Item label="Tốc độ máy bơm">
                            <div className="flex justify-between space-x-4">
                                <button
                                    type="button"
                                    className={`flex-1 py-2 px-3 rounded-lg border ${config.wateringSchedule.speed === 0 ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                                    onClick={() => handleScheduleFieldChange("wateringSchedule", "speed", 0)}
                                    disabled={!config.autoMode || !config.wateringSchedule.enabled || disabled || saving}
                                >
                                    Tắt (0%)
                                </button>
                                <button
                                    type="button"
                                    className={`flex-1 py-2 px-3 rounded-lg border ${config.wateringSchedule.speed === 50 ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                                    onClick={() => handleScheduleFieldChange("wateringSchedule", "speed", 50)}
                                    disabled={!config.autoMode || !config.wateringSchedule.enabled || disabled || saving}
                                >
                                    Vừa (50%)
                                </button>
                                <button
                                    type="button"
                                    className={`flex-1 py-2 px-3 rounded-lg border ${config.wateringSchedule.speed === 100 ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                                    onClick={() => handleScheduleFieldChange("wateringSchedule", "speed", 100)}
                                    disabled={!config.autoMode || !config.wateringSchedule.enabled || disabled || saving}
                                >
                                    Cao (100%)
                                </button>
                            </div>
                        </Form.Item>

                        <Form.Item label="Các ngày trong tuần">
                            <Select
                                mode="multiple"
                                style={{ width: '100%' }}
                                placeholder="Chọn các ngày"
                                value={config.wateringSchedule.days}
                                onChange={(val) => handleScheduleFieldChange("wateringSchedule", "days", val)}
                            >
                                <Option value="monday">Thứ 2</Option>
                                <Option value="tuesday">Thứ 3</Option>
                                <Option value="wednesday">Thứ 4</Option>
                                <Option value="thursday">Thứ 5</Option>
                                <Option value="friday">Thứ 6</Option>
                                <Option value="saturday">Thứ 7</Option>
                                <Option value="sunday">Chủ nhật</Option>
                            </Select>
                        </Form.Item>
                    </Form>
                </div>
            )}

            {/* Cấu hình cho đèn */}
            {isLightDevice && (
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <div className="font-medium text-lg"><BulbOutlined /> Lịch trình chiếu sáng</div>
                            <div className="text-sm text-gray-500">Thiết lập thời gian bật tắt đèn tự động</div>
                        </div>
                        <Switch
                            checked={config.lightSchedule.enabled}
                            onChange={(val) => handleScheduleFieldChange("lightSchedule", "enabled", val)}
                            className={config.lightSchedule.enabled ? "bg-yellow-500" : ""}
                            disabled={!config.autoMode || disabled || saving}
                        />
                    </div>

                    {!config.autoMode && (
                        <div className="text-red-600 text-sm bg-red-50 p-2 rounded mb-4">
                            Vui lòng bật chế độ tự động để sử dụng lịch trình.
                        </div>
                    )}

                    <Form layout="vertical" disabled={!config.autoMode || !config.lightSchedule.enabled || disabled || saving}>
                        <Form.Item label="Thời gian bật đèn">
                            <Input
                                type="time"
                                value={config.lightSchedule.onTime}
                                onChange={(e) => handleScheduleFieldChange("lightSchedule", "onTime", e.target.value)}
                            />
                        </Form.Item>

                        <Form.Item label="Thời gian tắt đèn">
                            <Input
                                type="time"
                                value={config.lightSchedule.offTime}
                                onChange={(e) => handleScheduleFieldChange("lightSchedule", "offTime", e.target.value)}
                            />
                        </Form.Item>

                        <Form.Item label="Các ngày trong tuần">
                            <Select
                                mode="multiple"
                                style={{ width: '100%' }}
                                placeholder="Chọn các ngày"
                                value={config.lightSchedule.days}
                                onChange={(val) => handleScheduleFieldChange("lightSchedule", "days", val)}
                            >
                                <Option value="monday">Thứ 2</Option>
                                <Option value="tuesday">Thứ 3</Option>
                                <Option value="wednesday">Thứ 4</Option>
                                <Option value="thursday">Thứ 5</Option>
                                <Option value="friday">Thứ 6</Option>
                                <Option value="saturday">Thứ 7</Option>
                                <Option value="sunday">Chủ nhật</Option>
                            </Select>
                        </Form.Item>
                    </Form>
                </div>
            )}

            <div className="flex justify-end">
                <Button
                    type="primary"
                    onClick={onSave}
                    loading={saving}
                    disabled={disabled || (!config.wateringSchedule?.enabled && !config.lightSchedule?.enabled && config.autoMode)}
                >
                    {saving ? "Đang lưu..." : "Lưu lịch trình"}
                </Button>
            </div>
        </Card>
    );
};

export default DeviceConfigModal;