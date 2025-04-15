const automationService = require('../services/automation.service');

// Lấy trạng thái tự động hóa
const getAutomationStatus = async (req, res) => {
  try {
    const status = automationService.getStatus();
    
    return res.status(200).json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error getting automation status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get automation status',
      error: error.message
    });
  }
};

// Bật/tắt tự động hóa
const toggleAutomation = async (req, res) => {
  try {
    const { enabled } = req.body;
    
    if (enabled === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing enabled parameter'
      });
    }
    
    const status = automationService.toggleAutomation(Boolean(enabled));
    
    return res.status(200).json({
      success: true,
      message: `Automation ${enabled ? 'enabled' : 'disabled'} successfully`,
      data: status
    });
  } catch (error) {
    console.error('Error toggling automation:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to toggle automation',
      error: error.message
    });
  }
};

module.exports = {
  getAutomationStatus,
  toggleAutomation
}; 