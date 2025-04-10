import { useState } from "react";
import { FaTrash } from "react-icons/fa";

const AddDeviceForm = () => {
  const [device, setDevice] = useState({
    username: "",
    deviceCode: "",
    description: "",
    status: "Off",
    mqttUsername: "",
    mqttApiKey: "",
    feeds: [{ name: "", feedKey: "", minValue: "", maxValue: "" }],
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setDevice((prev) => ({ ...prev, [name]: value }));
  };

  const handleFeedChange = (index, field, value) => {
    const updatedFeeds = [...device.feeds];
    updatedFeeds[index][field] = value;
    setDevice((prev) => ({ ...prev, feeds: updatedFeeds }));
  };

  const addFeed = () => {
    setDevice((prev) => ({
      ...prev,
      feeds: [
        ...prev.feeds,
        { name: "", feedKey: "", minValue: "", maxValue: "" },
      ],
    }));
  };

  const removeFeed = (indexToRemove) => {
    const updatedFeeds = device.feeds.filter(
      (_, index) => index !== indexToRemove
    );
    setDevice((prev) => ({ ...prev, feeds: updatedFeeds }));
  };

  const handleSubmit = () => {
    console.log("Submitted Device:", device);
    // Gửi device lên API tại đây nếu cần
  };

  return (
    <div className="my-6 p-6 max-w-xl mx-auto bg-white rounded-xl shadow-xl">
      <h2 className="text-2xl font-bold mb-4">Add Device</h2>

      <input
        type="text"
        name="username"
        value={device.username}
        onChange={handleChange}
        placeholder="Username (User Account)"
        className="w-full border p-2 mb-3"
      />

      <input
        type="text"
        name="deviceCode"
        value={device.deviceCode}
        onChange={handleChange}
        placeholder="Device Code"
        className="w-full border p-2 mb-3"
      />

      <input
        type="text"
        name="description"
        value={device.description}
        onChange={handleChange}
        placeholder="Description"
        className="w-full border p-2 mb-3"
      />

      {/* <select
        name="status"
        value={device.status}
        onChange={handleChange}
        className="w-full border p-2 mb-3"
      >
        <option value="On">On</option>
        <option value="Off">Off</option>
      </select> */}

      <div className="flex space-x-2 mb-5">
        <input
          type="text"
          name="mqttUsername"
          value={device.mqttUsername}
          onChange={handleChange}
          placeholder="MQTT Username"
          className="w-full border p-2"
        />

        <input
          type="text"
          name="mqttApiKey"
          value={device.mqttApiKey}
          onChange={handleChange}
          placeholder="MQTT API Key"
          className="w-full border p-2"
        />
      </div>

      <h3 className="text-lg font-semibold mb-2">Feeds</h3>
      {device.feeds.map((feed, index) => (
        <div
          key={index}
          className="mb-4 border p-3 rounded bg-gray-50 relative"
        >
          <div className="flex space-x-2 mb-3">
            <input
              type="text"
              value={feed.name}
              onChange={(e) => handleFeedChange(index, "name", e.target.value)}
              placeholder="Feed Name"
              className="w-full border p-2"
            />
            <input
              type="text"
              value={feed.feedKey}
              onChange={(e) =>
                handleFeedChange(index, "feedKey", e.target.value)
              }
              placeholder="Feed Key"
              className="w-full border p-2"
            />
          </div>
          <div className="flex space-x-2">
            <input
              type="number"
              value={feed.minValue}
              onChange={(e) =>
                handleFeedChange(index, "minValue", e.target.value)
              }
              placeholder="Min Value"
              className="w-full border p-2"
            />
            <input
              type="number"
              value={feed.maxValue}
              onChange={(e) =>
                handleFeedChange(index, "maxValue", e.target.value)
              }
              placeholder="Max Value"
              className="w-full border p-2"
            />
          </div>
          <button
            onClick={() => removeFeed(index)}
            className="absolute top-0 right-0 text-red-500 hover:text-red-700 bg-white p-1 rounded-full"
            title="Xoá feed này"
          >
            <FaTrash />
          </button>
        </div>
      ))}

      <div className="flex justify-between items-center mx-6">
        <button
          className="mb-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          onClick={addFeed}
        >
          More Feeds
        </button>

        <button
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          onClick={handleSubmit}
        >
          Add Device
        </button>
      </div>
    </div>
  );
};

export default AddDeviceForm;
