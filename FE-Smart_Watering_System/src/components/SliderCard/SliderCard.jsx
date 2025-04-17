import { Slider, InputNumber } from "antd";

const SliderCard = ({
  title,
  unit = "",
  maxLimit = 100,
  value,
  onChange,
  marks,
  step = 1,
  hideInput,
  isSingleValue = false,
  description,
  disabled = false,
}) => {
  const handleChange = (val) => {
    if (isSingleValue) {
      onChange(val);
    }
  };

  const handleMinChange = (val) => {
    if (val > value.max) val = value.max;
    onChange({ ...value, min: val });
  };

  const handleMaxChange = (val) => {
    if (val < value.min) val = value.min;
    onChange({ ...value, max: val });
  };

  // Hàm định dạng giá trị cho tooltip
  const formatTooltip = (val) => {
    if (val === undefined || val === null) return "";
    return `${val}${unit}`;
  };

  return (
    <div className="rounded-2xl shadow-lg p-6 bg-white transition hover:shadow-xl">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">{title}</h2>
      
      {description && (
        <p className="text-sm text-gray-600 mb-4">{description}</p>
      )}

      {!isSingleValue && (
        <>
          <div className="text-sm text-gray-700 mb-1 flex items-center gap-2">
            Min Limit:{" "}
            {!hideInput && (
              <>
                <InputNumber
                  min={0}
                  max={value.max}
                  value={value.min}
                  onChange={handleMinChange}
                  className="w-[60px]"
                  disabled={disabled}
                />
                {unit}
              </>
            )}
          </div>
          <Slider
            min={0}
            max={maxLimit}
            value={value.min}
            onChange={handleMinChange}
            tooltip={{ formatter: formatTooltip }}
            trackStyle={{ backgroundColor: "#3b82f6" }}
            handleStyle={{ borderColor: "#3b82f6" }}
            marks={marks}
            step={step}
            disabled={disabled}
          />

          <div className="text-sm text-gray-700 mb-1 flex items-center gap-2">
            Max Limit:{" "}
            {!hideInput && (
              <>
                <InputNumber
                  min={value.min}
                  max={maxLimit}
                  value={value.max}
                  onChange={handleMaxChange}
                  className="w-[60px]"
                  disabled={disabled}
                />
                {unit}
              </>
            )}
          </div>
          <Slider
            min={0}
            max={maxLimit}
            value={value.max}
            onChange={handleMaxChange}
            tooltip={{ formatter: formatTooltip }}
            trackStyle={{ backgroundColor: "#3b82f6" }}
            handleStyle={{ borderColor: "#3b82f6" }}
            marks={marks}
            step={step}
            disabled={disabled}
          />
        </>
      )}

      {isSingleValue && (
        <>
          {!hideInput && (
            <div className="text-sm text-gray-700 mb-2 flex items-center gap-2">
              Value:{" "}
              <InputNumber
                min={0}
                max={maxLimit}
                value={value}
                onChange={onChange}
                className="w-[60px]"
                disabled={disabled}
              />
              {unit}
            </div>
          )}
          <Slider
            min={0}
            max={maxLimit}
            value={value}
            onChange={handleChange}
            tooltip={{ formatter: formatTooltip }}
            trackStyle={{ backgroundColor: "#3b82f6" }}
            handleStyle={{ borderColor: "#3b82f6" }}
            marks={marks}
            step={step}
            disabled={disabled}
          />
        </>
      )}
    </div>
  );
};

export default SliderCard;
