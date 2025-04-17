import { useState, useEffect } from "react";
import { Card, Spin, Typography, DatePicker, Button, Empty } from "antd";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Colors,
} from "chart.js";
import "chart.js/auto";
import DeviceServices from "../../services/DeviceServices";
import { toast } from "react-toastify";
import dayjs from "dayjs";

const { Title: TitleAnt } = Typography;
const { RangePicker } = DatePicker;

// Đăng ký các components cần thiết cho Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Colors
);

const Report = () => {
  const [loading, setLoading] = useState(false);
  const [sensorData, setSensorData] = useState({
    temperature: [],
    humidity: [],
    soilMoisture: []
  });
  const [dateRange, setDateRange] = useState([dayjs().subtract(7, 'day'), dayjs()]);

  // Lấy dữ liệu cảm biến khi component mount hoặc khi thay đổi khoảng thời gian
  useEffect(() => {
    fetchSensorData();
  }, [dateRange]);

  // Lấy dữ liệu cho các loại cảm biến
  const fetchSensorData = async () => {
    setLoading(true);
    
    try {
      // Lấy tất cả thiết bị của người dùng
      const devices = await DeviceServices.getAllDevices();
      
      let temperatureData = [];
      let humidityData = [];
      let soilMoistureData = [];
      
      // Lấy dữ liệu từ tất cả các thiết bị
      for(const device of devices) {
        // Lấy dữ liệu nhiệt độ/độ ẩm không khí
        if (device.deviceType === 'temperature_humidity') {
          const tempHumidData = await DeviceServices.getTemperatureHumidityData(device.id);
          const deviceTempHumidData = Array.isArray(tempHumidData) ? tempHumidData : (tempHumidData.data || []);
          const tempWithDeviceInfo = deviceTempHumidData.map(data => ({
            ...data,
            deviceName: device.deviceName || device.deviceCode
          }));
          
          temperatureData = [...temperatureData, ...tempWithDeviceInfo];
          humidityData = [...humidityData, ...tempWithDeviceInfo];
        }
        
        // Lấy dữ liệu độ ẩm đất
        if (device.deviceType === 'soil_moisture') {
          const soilData = await DeviceServices.getSoilMoistureData(device.id);
          const deviceSoilData = Array.isArray(soilData) ? soilData : (soilData.data || []);
          const soilWithDeviceInfo = deviceSoilData.map(data => ({
            ...data,
            deviceName: device.deviceName || device.deviceCode
          }));
          
          soilMoistureData = [...soilMoistureData, ...soilWithDeviceInfo];
        }
      }
      
      setSensorData({
        temperature: temperatureData,
        humidity: humidityData,
        soilMoisture: soilMoistureData
      });
    } catch (error) {
      console.error("Error fetching sensor data:", error);
      toast.error("Không thể tải dữ liệu cảm biến");
    } finally {
      setLoading(false);
    }
  };

  // Xử lý khi thay đổi khoảng thời gian
  const handleDateRangeChange = (dates) => {
    setDateRange(dates);
  };

  // Áp dụng bộ lọc thời gian cho dữ liệu
  const applyDateFilter = (dataArray) => {
    if (!dateRange || !dateRange[0] || !dateRange[1] || !dataArray || !dataArray.length) {
      return dataArray;
    }

    const startDate = dateRange[0].startOf('day');
    const endDate = dateRange[1].endOf('day');

    return dataArray.filter(item => {
      const itemDate = dayjs(item.readingTime);
      return itemDate.isAfter(startDate) && itemDate.isBefore(endDate);
    });
  };

  // Tạo dữ liệu cho biểu đồ tổng hợp
  const combinedChartData = {
    labels: applyDateFilter(sensorData.temperature).map(item => new Date(item.readingTime).toLocaleString()),
    datasets: [
      {
        label: 'Nhiệt độ',
        data: applyDateFilter(sensorData.temperature).map(item => item.temperature),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        yAxisID: 'values',
        tension: 0.4,
        borderWidth: 2,
      },
      {
        label: 'Độ ẩm không khí',
        data: applyDateFilter(sensorData.humidity).map(item => item.humidity),
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        yAxisID: 'values',
        tension: 0.4,
        borderWidth: 2,
      },
      {
        label: 'Độ ẩm đất',
        data: applyDateFilter(sensorData.soilMoisture).map(item => item.moistureValue),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        yAxisID: 'values',
        tension: 0.4,
        borderWidth: 2,
      },
    ],
  };

  // Cấu hình cho biểu đồ tổng hợp
  const combinedChartOptions = {
    responsive: true,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    stacked: false,
    plugins: {
      title: {
        display: true,
        text: 'Biểu đồ Tổng hợp Dữ liệu Cảm biến',
        font: {
          size: 18
        }
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            const dataIndex = context.dataIndex;
            const datasetIndex = context.datasetIndex;
            let dataArray;

            if (datasetIndex === 0) {
              dataArray = applyDateFilter(sensorData.temperature);
            } else if (datasetIndex === 1) {
              dataArray = applyDateFilter(sensorData.humidity);
            } else {
              dataArray = applyDateFilter(sensorData.soilMoisture);
            }

            const deviceName = dataArray[dataIndex]?.deviceName || '';
            let label = context.dataset.label || '';

            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y;
            }
            return [label, `Thiết bị: ${deviceName}`];
          }
        }
      }
    },
    scales: {
      values: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: false
        },
        min: 0,
        max: 100,
        ticks: {
          callback: function (value) {
            return value;
          }
        }
      }
    },
  };

  const refreshData = () => {
    fetchSensorData();
    toast.success("Đã làm mới dữ liệu");
  };

  const hasData = () => {
    return sensorData.temperature.length > 0 ||
      sensorData.humidity.length > 0 ||
      sensorData.soilMoisture.length > 0;
  };

  return (
    <div className="p-6">
      <TitleAnt level={2} className="mb-6">Báo cáo dữ liệu cảm biến</TitleAnt>

      <Card className="mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-grow">
            <label className="block mb-1 font-medium">Khoảng thời gian:</label>
            <RangePicker
              value={dateRange}
              onChange={handleDateRangeChange}
              className="w-full md:w-auto"
            />
          </div>

          <div className="flex items-end">
            <Button type="primary" onClick={refreshData}>
              Làm mới dữ liệu
            </Button>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-20">
          <Spin size="large" />
        </div>
      ) : !hasData() ? (
        <Empty description="Không có dữ liệu cảm biến" />
      ) : (
        <Card className="p-4">
          <div className="chart-container" style={{ height: '500px' }}>
            <Line data={combinedChartData} options={combinedChartOptions} />
          </div>
        </Card>
      )}
    </div>
  );
};

export default Report;