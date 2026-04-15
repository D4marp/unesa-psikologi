const Device = require('../models/Device');
const Consumption = require('../models/Consumption');

class DeviceController {
  static getNodeRedControlUrl() {
    const baseUrl = (process.env.NODERED_CONTROL_BASE_URL || 'http://10.12.1.97:1880').replace(/\/$/, '');
    const endpointPath = process.env.NODERED_CONTROL_PATH || '/api/device-control';
    return `${baseUrl}${endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`}`;
  }

  static async getAll(req, res) {
    try {
      const devices = await Device.getAll();

      // Attach latest consumption data for each device
      const devicesWithConsumption = await Promise.all(
        devices.map(async (device) => {
          const today = new Date().toISOString().split('T')[0];
          const consumptionData = await Consumption.getDaily(device.id, today);
          return {
            ...device,
            consumption: consumptionData
          };
        })
      );

      res.json({
        success: true,
        data: devicesWithConsumption
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  static async getByClass(req, res) {
    try {
      const { classId } = req.params;
      const devices = await Device.getByClass(classId);

      // Attach latest consumption data for each device
      const devicesWithConsumption = await Promise.all(
        devices.map(async (device) => {
          const today = new Date().toISOString().split('T')[0];
          const consumptionData = await Consumption.getDaily(device.id, today);
          return {
            ...device,
            consumption: consumptionData
          };
        })
      );

      res.json({
        success: true,
        data: devicesWithConsumption
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  static async getByClassCode(req, res) {
    try {
      const { classCode } = req.params;
      const devices = await Device.getByClassCode(classCode);

      const devicesWithConsumption = await Promise.all(
        devices.map(async (device) => {
          const today = new Date().toISOString().split('T')[0];
          const consumptionData = await Consumption.getDaily(device.id, today);
          return {
            ...device,
            consumption: consumptionData
          };
        })
      );

      res.json({
        success: true,
        data: devicesWithConsumption
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  static async getById(req, res) {
    try {
      const { id } = req.params;
      const device = await Device.getById(id);

      if (!device) {
        return res.status(404).json({
          success: false,
          message: 'Device not found'
        });
      }

      // Get consumption data
      const today = new Date().toISOString().split('T')[0];
      const consumptionData = await Consumption.getDaily(device.id, today);

      res.json({
        success: true,
        data: {
          ...device,
          consumption: consumptionData
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  static async create(req, res) {
    try {
      const {
        class_id,
        name,
        device_name,        // New IoT field
        type,
        device_type,        // New IoT field
        brand,
        model,
        power_rating,
        efficiency_rating,
        installation_date,
        warranty_expiry,
        notes,
        device_eui,         // New IoT field
        application_type,   // New IoT field
        location            // New IoT field
      } = req.body;

      // Validate required fields (support both old and new names)
      const finalName = device_name || name;
      const finalType = device_type || type;

      if (!class_id || !finalName || !finalType || !power_rating) {
        return res.status(400).json({
          success: false,
          message: 'class_id, name (or device_name), type (or device_type), and power_rating are required'
        });
      }

      const result = await Device.create({
        class_id,
        name: finalName,
        device_name: finalName,
        type: finalType,
        device_type: finalType,
        brand,
        model,
        power_rating,
        efficiency_rating,
        installation_date,
        warranty_expiry,
        notes,
        device_eui,
        application_type,
        location
      });

      res.status(201).json({
        success: true,
        message: 'Device created successfully',
        data: {
          id: result.insertId,
          class_id,
          device_name: finalName,
          device_type: finalType,
          device_eui: device_eui || null,
          application_type: application_type || null,
          location: location || null,
          brand,
          model,
          power_rating,
          efficiency_rating
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const data = req.body;

      const deviceExists = await Device.getById(id);
      if (!deviceExists) {
        return res.status(404).json({
          success: false,
          message: 'Device not found'
        });
      }

      await Device.update(id, data);

      res.json({
        success: true,
        message: 'Device updated successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  static async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status || !['active', 'idle', 'offline', 'maintenance'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Must be: active, idle, offline, or maintenance'
        });
      }

      const deviceExists = await Device.getById(id);
      if (!deviceExists) {
        return res.status(404).json({
          success: false,
          message: 'Device not found'
        });
      }

      await Device.updateStatus(id, status);

      res.json({
        success: true,
        message: 'Device status updated successfully',
        data: { id, status }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  static async controlViaNodeRed(req, res) {
    try {
      const { id } = req.params;
      const { action } = req.body;

      if (!action || !['on', 'off'].includes(String(action).toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid action. Must be on or off'
        });
      }

      const device = await Device.getById(id);
      if (!device) {
        return res.status(404).json({
          success: false,
          message: 'Device not found'
        });
      }

      const normalizedAction = String(action).toLowerCase();
      const nodeRedUrl = DeviceController.getNodeRedControlUrl();

      const payload = {
        deviceId: Number(id),
        deviceEui: device.device_eui || null,
        deviceType: device.device_type || null,
        classCode: device.location || device.class_name || null,
        action: normalizedAction,
      };

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      let nodeRedResponse;
      try {
        nodeRedResponse = await fetch(nodeRedUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      let nodeRedData = null;
      try {
        nodeRedData = await nodeRedResponse.json();
      } catch (e) {
        nodeRedData = null;
      }

      if (!nodeRedResponse.ok) {
        return res.status(502).json({
          success: false,
          message: 'Node-RED control request failed',
          upstreamStatus: nodeRedResponse.status,
          upstreamData: nodeRedData,
        });
      }

      const nextStatus = normalizedAction === 'on' ? 'active' : 'idle';
      await Device.updateStatus(id, nextStatus);

      return res.json({
        success: true,
        message: `Device ${normalizedAction.toUpperCase()} command sent successfully`,
        data: {
          id: Number(id),
          action: normalizedAction,
          status: nextStatus,
          nodeRed: nodeRedData,
        }
      });
    } catch (error) {
      const message = error?.name === 'AbortError'
        ? 'Node-RED control request timed out'
        : error.message;

      return res.status(500).json({
        success: false,
        message,
      });
    }
  }

  static async controlClassViaNodeRed(req, res) {
    try {
      const { classCode } = req.params;
      const { action } = req.body;

      if (!classCode) {
        return res.status(400).json({
          success: false,
          message: 'classCode is required'
        });
      }

      if (!action || !['on', 'off'].includes(String(action).toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid action. Must be on or off'
        });
      }

      const devices = await Device.getByClassCode(classCode);
      if (!devices || devices.length === 0) {
        return res.status(404).json({
          success: false,
          message: `No devices found for class ${classCode}`
        });
      }

      const normalizedAction = String(action).toLowerCase();
      const nodeRedUrl = DeviceController.getNodeRedControlUrl();

      const payload = {
        classCode,
        action: normalizedAction,
        scope: 'class',
        deviceIds: devices.map((d) => d.id),
      };

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      let nodeRedResponse;
      try {
        nodeRedResponse = await fetch(nodeRedUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      let nodeRedData = null;
      try {
        nodeRedData = await nodeRedResponse.json();
      } catch (e) {
        nodeRedData = null;
      }

      if (!nodeRedResponse.ok) {
        return res.status(502).json({
          success: false,
          message: 'Node-RED class control request failed',
          upstreamStatus: nodeRedResponse.status,
          upstreamData: nodeRedData,
        });
      }

      const nextStatus = normalizedAction === 'on' ? 'active' : 'idle';
      await Promise.all(devices.map((device) => Device.updateStatus(device.id, nextStatus)));

      return res.json({
        success: true,
        message: `Class ${classCode} ${normalizedAction.toUpperCase()} command sent successfully`,
        data: {
          classCode,
          action: normalizedAction,
          status: nextStatus,
          affectedDevices: devices.length,
          nodeRed: nodeRedData,
        }
      });
    } catch (error) {
      const message = error?.name === 'AbortError'
        ? 'Node-RED class control request timed out'
        : error.message;

      return res.status(500).json({
        success: false,
        message,
      });
    }
  }

  static async updateReading(req, res) {
    try {
      const { id } = req.params;
      const { power, temperature } = req.body;

      if (power === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Power reading is required'
        });
      }

      const deviceExists = await Device.getById(id);
      if (!deviceExists) {
        return res.status(404).json({
          success: false,
          message: 'Device not found'
        });
      }

      await Device.updateReading(id, power, temperature);

      res.json({
        success: true,
        message: 'Device reading updated successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.params;

      const deviceExists = await Device.getById(id);
      if (!deviceExists) {
        return res.status(404).json({
          success: false,
          message: 'Device not found'
        });
      }

      await Device.delete(id);

      res.json({
        success: true,
        message: 'Device deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  static async getByType(req, res) {
    try {
      const { type } = req.params;
      const devices = await Device.getByType(type);

      res.json({
        success: true,
        data: devices
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = DeviceController;
