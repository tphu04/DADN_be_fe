import { useState } from "react";
import { message } from "antd";
import { SaveOutlined } from "@ant-design/icons";

// Component
import SliderCard from "../../components/SliderCard/SliderCard";
import ToggleCard from "../../components/ToggleCard/ToggleCard";

const ConfigDevice = () => {
  const [configs, setConfigs] = useState({
    soilMoisture: { min: 0, max: 100 },
    temperature: { min: 0, max: 100 },
    airHumidity: { min: 0, max: 100 },
    pumpWaterSpeed: 50,
    light: true,
  });

  const handleRangeChange = (key, value) => {
    setConfigs((prev) => ({ ...prev, [key]: value }));
  };

  const handleSingleValueChange = (key, value) => {
    setConfigs((prev) => ({ ...prev, [key]: value }));
  };

  const handleToggleChange = (key, value) => {
    setConfigs((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveAll = () => {
    console.log("Saved configs:", configs);
    message.success("Device settings saved!");
  };

  return (
    <div className="p-4 md:p-6 lg:p-10">
      <h1 className="text-2xl md:text-3xl font-bold mb-8 text-gray-800 text-center">
        Configure Device Settings
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <SliderCard
          title="Soil Moisture"
          unit="%"
          maxLimit={100}
          value={configs.soilMoisture}
          onChange={(val) => handleRangeChange("soilMoisture", val)}
        />
        <SliderCard
          title="Temperature"
          unit="°C"
          maxLimit={100}
          value={configs.temperature}
          onChange={(val) => handleRangeChange("temperature", val)}
        />
        <SliderCard
          title="Air Humidity"
          unit="%"
          maxLimit={100}
          value={configs.airHumidity}
          onChange={(val) => handleRangeChange("airHumidity", val)}
        />
        <SliderCard
          title="Pump Water Speed"
          unit="%"
          maxLimit={100}
          value={configs.pumpWaterSpeed}
          onChange={(val) => handleSingleValueChange("pumpWaterSpeed", val)}
          hideInput={false}
          marks={{ 0: "0%", 50: "50%", 100: "100%" }}
          step={50}
          isSingleValue
        />
        <ToggleCard
          toggles={[
            {
              title: "Light",
              value: configs.light,
              onChange: (val) => handleToggleChange("light", val),
            },
            {
              title: "Pump Water",
              value: configs.pumpWaterSpeed > 0,
              onChange: (val) =>
                handleSingleValueChange("pumpWaterSpeed", val ? 50 : 0),
            },
          ]}
        />
      </div>

      <div className="mt-10 flex justify-center md:justify-end">
        <button
          onClick={handleSaveAll}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-full flex items-center gap-2 shadow-md transition"
        >
          <SaveOutlined />
          Save All
        </button>
      </div>
    </div>
  );
};

export default ConfigDevice;
