# Node-RED Setup untuk IoT Data Collection

## 📦 Files dalam folder ini:

- **Q1.01.02.json** - Original (IR Remote Control flow)
- **Q1.01.02-SENSOR-FLOW.json** ✨ (Energy Monitor - Data Collection)
- **Q1.01.03.json, Q1.01.04.json** - Untuk class lain
- **FLOW-DOCUMENTATION.md** - Dokumentasi lengkap
- **PAYLOAD-EXAMPLES.md** - Test cases dan device payload
- **README.md** - File ini

---

## 🚀 Quick Start

### Step 1: Install Node-RED
```bash
sudo npm install -g node-red
```

### Step 2: Start Node-RED
```bash
node-red
```
Accessible di `http://localhost:1880`

### Step 3: Deploy Flow
1. Import `Q1.01.02-SENSOR-FLOW.json` ke Node-RED
2. Configure MQTT broker
3. Deploy dan test

---

## 🔗 Data Flow

```
IoT Device (MQTT)
    ↓
[MQTT Input]
    ↓
[Parse & Validate]
    ↓
[Format for API]
    ↓
[HTTP POST to Backend]
    ↓
[Database]
```

---

## 📊 Setup Requirements

- Node.js & npm
- Node-RED
- MQTT Broker (Mosquitto)
- Backend API running (port 5002)
- MySQL database

---

## 🧪 Testing

```bash
mosquitto_pub -h localhost -t "sensor/q1.01.02/ac" -m '{
  "device_id": 1,
  "consumption": 2.5,
  "temperature": 24,
  "humidity": 65
}'
```

---

## 📚 Next Steps

1. Setup Node-RED
2. Import flow JSON
3. Configure MQTT connection
4. Register IoT devices in database
5. Test with MQTT messages
6. Monitor via debug nodes & database

