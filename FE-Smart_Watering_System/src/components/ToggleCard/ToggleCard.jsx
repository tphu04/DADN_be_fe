import { Switch } from "antd";

const ToggleCard = ({ toggles }) => (
  <div className="rounded-2xl shadow-md p-6 bg-white transition hover:shadow-lg">
    <h2 className="text-lg font-semibold text-gray-800 mb-4">
      Device On/Off Settings
    </h2>
    <div className="flex flex-col gap-4">
      {toggles.map(({ title, value, onChange }, index) => (
        <div key={index} className="flex items-center justify-between">
          <span className="text-gray-700">{title}</span>
          <Switch
            checked={value}
            onChange={onChange}
            checkedChildren="On"
            unCheckedChildren="Off"
            className="bg-gray-300"
          />
        </div>
      ))}
    </div>
  </div>
);

export default ToggleCard;
