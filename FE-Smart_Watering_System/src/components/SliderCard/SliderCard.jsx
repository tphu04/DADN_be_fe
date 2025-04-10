import { Slider, InputNumber } from "antd";

const SliderCard = ({
  title,
  unit,
  maxLimit,
  value,
  onChange,
  marks,
  step,
  hideInput,
  isSingleValue = false,
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

  return (
    <div className="rounded-2xl shadow-lg p-6 bg-white transition hover:shadow-xl">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">{title}</h2>

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
            tooltip={{ formatter: (val) => `${val}${unit}` }}
            trackStyle={{ backgroundColor: "#3b82f6" }}
            handleStyle={{ borderColor: "#3b82f6" }}
            marks={marks}
            step={step}
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
            tooltip={{ formatter: (val) => `${val}${unit}` }}
            trackStyle={{ backgroundColor: "#3b82f6" }}
            handleStyle={{ borderColor: "#3b82f6" }}
            marks={marks}
            step={step}
          />
        </>
      )}

      {isSingleValue && (
        <>
          {!hideInput && (
            <div className="text-sm text-gray-700 mb-2 flex items-center gap-2">
              Value:
              {/* <InputNumber
                min={0}
                max={maxLimit}
                value={value}
                onChange={onChange}
                className="w-[60px]"
              />
              {unit} */}
            </div>
          )}
          <Slider
            min={0}
            max={maxLimit}
            value={value}
            onChange={handleChange}
            tooltip={{ formatter: (val) => `${val}${unit}` }}
            trackStyle={{ backgroundColor: "#3b82f6" }}
            handleStyle={{ borderColor: "#3b82f6" }}
            marks={marks}
            step={step}
          />
        </>
      )}
    </div>
  );
};

export default SliderCard;
