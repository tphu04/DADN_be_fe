import { Switch } from "antd";

const ToggleCard = ({ toggles }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">Controls</h3>
      <div className="space-y-4">
        {toggles.map((toggle, index) => (
          <div key={index} className="flex justify-between items-center">
            <span>{toggle.title}</span>
            <Switch
              checked={toggle.value}
              onChange={toggle.onChange}
              disabled={toggle.disabled}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ToggleCard;
