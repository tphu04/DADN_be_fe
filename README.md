# Smart Watering System - IoT Project

A full-stack IoT application for automated plant watering and monitoring system using Node.js, Express, Prisma, React, and MQTT integration.

## Project Overview

Smart Watering System provides:
- Real-time monitoring of temperature, humidity, and soil moisture
- Automated watering based on sensor data
- Light control scheduling
- Device management and configuration
- User management and authentication
- Data visualization and reporting

## System Architecture

### Backend (Node.js + Express + Prisma)

#### Key Features
- RESTful API endpoints
- MQTT integration for IoT device communication
- Real-time data processing
- Automated device control
- Schedule management
- User authentication and authorization

#### Design Patterns
- Factory Pattern for IoT device management
- Service-based architecture
- MVC pattern

### Frontend (React + Vite)

#### Key Features
- Real-time dashboard
- Device control interface
- Configuration management
- Scheduling system
- User management
- Responsive design with Tailwind CSS

#### Components
- Device management cards
- Real-time sensor displays
- Interactive control panels
- Configuration forms
- Schedule management interface

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MySQL database
- MQTT broker account (e.g., Adafruit IO)
- Git

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd <project-directory>
```

2. Install Backend Dependencies
```bash
cd be-DADN-watering-system
npm install
```

3. Configure Backend Environment
- Create `.env` file in backend directory:
```env
PORT=3000
DATABASE_URL="mysql://user:password@localhost:3306/watering_system"
MQTT_HOST="io.adafruit.com"
MQTT_USERNAME="your_username"
MQTT_API_KEY="your_key"
JWT_SECRET="your_secret"
```

4. Initialize Database
```bash
cd config/prisma
npx prisma migrate dev --name init
npx prisma generate
```

5. Install Frontend Dependencies
```bash
cd ../../FE-Smart_Watering_System
npm install
```

6. Configure Frontend Environment
- Create `.env` file in frontend directory:
```env
VITE_API_URL=http://localhost:3000
VITE_MQTT_HOST=io.adafruit.com
VITE_MQTT_USERNAME=your_username
VITE_MQTT_API_KEY=your_key
```

### Running the Application

1. Start Backend Server
```bash
cd be-DADN-watering-system
npm run dev
```

2. Start Frontend Development Server
```bash
cd FE-Smart_Watering_System
npm run dev
```

The frontend will be available at `http://localhost:5173` and the backend at `http://localhost:3000`

## API Documentation

### Authentication Endpoints
- POST `/api/auth/register` - User registration
- POST `/api/auth/login` - User login
- POST `/api/auth/logout` - User logout

### Device Endpoints
- GET `/api/devices` - List all devices
- POST `/api/devices` - Create new device
- PUT `/api/devices/:id` - Update device
- DELETE `/api/devices/:id` - Delete device
- POST `/api/devices/:id/control` - Control device

### Sensor Endpoints
- GET `/api/sensors/data` - Get sensor readings
- GET `/api/sensors/history` - Get historical data

### Schedule Endpoints
- GET `/api/schedules` - List schedules
- POST `/api/schedules` - Create schedule
- PUT `/api/schedules/:id` - Update schedule
- DELETE `/api/schedules/:id` - Delete schedule

## Testing

### Backend Testing
```bash
cd be-DADN-watering-system
npm run test
```

### Frontend Testing
```bash
cd FE-Smart_Watering_System
npm run test
```

## Project Structure

### Backend Structure
```
be-DADN-watering-system/
├── config/           # Configuration files
├── src/
│   ├── controllers/ # Request handlers
│   ├── factory/     # Device pattern factory
│   ├── middleware/  # Auth & request middleware
│   ├── models/      # Data models
│   ├── routes/      # API routes
│   └── services/    # Business logic
```

### Frontend Structure
```
FE-Smart_Watering_System/
├── src/
│   ├── components/  # Reusable UI components
│   ├── context/     # React context
│   ├── hooks/       # Custom hooks
│   ├── pages/       # Page components
│   └── services/    # API services
```

