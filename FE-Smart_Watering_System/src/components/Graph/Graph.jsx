import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const data = [
  { time: "03:08", soil: 20, temp: 24, humidity: 60 },
  { time: "03:59", soil: 22, temp: 25, humidity: 63 },
  { time: "01:16", soil: 18, temp: 26, humidity: 58 },
  { time: "15:49", soil: 25, temp: 28, humidity: 65 },
  { time: "15:51", soil: 21, temp: 27, humidity: 62 },
  { time: "15:53", soil: 19, temp: 26, humidity: 61 },
  { time: "16:00", soil: 23, temp: 29, humidity: 66 },
  { time: "16:09", soil: 24, temp: 30, humidity: 68 },
  { time: "18:55", soil: 22, temp: 28, humidity: 64 },
];

const Graph = (soilData, temperatureData, humidityData) => {
  return (
    <div className="w-full h-[360px] bg-white rounded-xl shadow p-4">
      <h2 className="text-lg font-semibold mb-2 text-center">
        Biểu đồ cảm biến
      </h2>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="soil"
            name="Soil Moisture(%)"
            stroke="#38bdf8"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="temp"
            name="Temperature(°C)"
            stroke="#f472b6"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="humidity"
            name="Air Humidity(%)"
            stroke="#34d399"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default Graph;
