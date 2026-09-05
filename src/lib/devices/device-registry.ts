// =============================================================================
// DEVICE REGISTRY - Type Definitions, Capabilities, Protocols & Templates
// =============================================================================
// Central registry defining all supported device types, their capabilities,
// communication protocols, and reusable device templates.
// =============================================================================

import { randomBytes, createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

// -----------------------------------------------------------------------------
// Device Type Definitions
// -----------------------------------------------------------------------------

export enum DeviceCategory {
  SENSOR = 'sensor',
  ACTUATOR = 'actuator',
  GATEWAY = 'gateway',
  CONTROLLER = 'controller',
  EDGE = 'edge',
  CAMERA = 'camera',
  WEARABLE = 'wearable',
  CUSTOM = 'custom',
}

export enum DeviceStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  PROVISIONING = 'provisioning',
  UPDATING = 'updating',
  ERROR = 'error',
  MAINTENANCE = 'maintenance',
  SUSPENDED = 'suspended',
}

export enum Protocol {
  MQTT = 'mqtt',
  HTTP = 'http',
  WEBSOCKET = 'websocket',
  COAP = 'coap',
  LORA = 'lora',
  ZIGBEE = 'zigbee',
  BLUETOOTH = 'bluetooth',
  TCP = 'tcp',
  UDP = 'udp',
  MODBUS = 'modbus',
}

export enum DataFormat {
  JSON = 'json',
  CBOR = 'cbor',
  PROTOBUF = 'protobuf',
  XML = 'xml',
  CSV = 'csv',
  BINARY = 'binary',
}

export enum FrequencyUnit {
  MILLISECONDS = 'ms',
  SECONDS = 's',
  MINUTES = 'min',
  HOURS = 'h',
  DAYS = 'd',
}

// -----------------------------------------------------------------------------
// Capability Definitions
// -----------------------------------------------------------------------------

export enum CapabilityType {
  TEMPERATURE = 'temperature',
  HUMIDITY = 'humidity',
  PRESSURE = 'pressure',
  LIGHT = 'light',
  MOTION = 'motion',
  GPS = 'gps',
  ACCELEROMETER = 'accelerometer',
  GYROSCOPE = 'gyroscope',
  BATTERY = 'battery',
  SIGNAL_STRENGTH = 'signal_strength',
  VIBRATION = 'vibration',
  SOUND = 'sound',
  GAS = 'gas',
  SMOKE = 'smoke',
  WATER_FLOW = 'water_flow',
  POWER_CONSUMPTION = 'power_consumption',
  VOLTAGE = 'voltage',
  CURRENT = 'current',
  DIGITAL_IO = 'digital_io',
  ANALOG_IO = 'analog_io',
  PWM = 'pwm',
  SERIAL = 'serial',
  CAMERA = 'camera',
  RFID = 'rfid',
  NFC = 'nfc',
  CUSTOM = 'custom',
}

export interface CapabilityDefinition {
  type: CapabilityType;
  name: string;
  description: string;
  unit: string;
  minValue?: number;
  maxValue?: number;
  precision?: number;
  decimalPlaces?: number;
  readingInterval: { value: number; unit: FrequencyUnit };
  writable: boolean;
  readable: boolean;
  notifyOnChange: boolean;
  changeThreshold?: number;
  dataPoints?: string[];
}

export interface DeviceCapability {
  id: string;
  definitionId: CapabilityType;
  alias: string;
  enabled: boolean;
  calibrationOffset?: number;
  calibrationScale?: number;
  customConfig?: Record<string, unknown>;
  lastReading?: {
    value: number;
    unit: string;
    timestamp: Date;
  };
}

// -----------------------------------------------------------------------------
// Protocol Support
// -----------------------------------------------------------------------------

export interface ProtocolConfig {
  protocol: Protocol;
  enabled: boolean;
  endpoint?: string;
  port?: number;
  topic?: string;
  clientId?: string;
  username?: string;
  password?: string;
  qos?: 0 | 1 | 2;
  retain?: boolean;
  keepAlive?: number;
  cleanSession?: boolean;
  willTopic?: string;
  willMessage?: string;
  tls?: boolean;
  caCert?: string;
  clientCert?: string;
  clientKey?: string;
  dataFormat: DataFormat;
  compression?: 'gzip' | 'snappy' | 'zstd';
  batchSize?: number;
  batchInterval?: number;
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
  customHeaders?: Record<string, string>;
}

export interface ProtocolCapabilities {
  supportedProtocols: Protocol[];
  preferredProtocol: Protocol;
  supportedFormats: DataFormat[];
  maxPayloadSize: number;
  supportsBidirectional: boolean;
  supportsBinary: boolean;
  supportsRetainedMessages: boolean;
  supportsLastWill: boolean;
  maxConnections?: number;
  heartbeatInterval?: number;
}

// -----------------------------------------------------------------------------
// Device Type Definition
// -----------------------------------------------------------------------------

export interface DeviceTypeDefinition {
  id: string;
  name: string;
  category: DeviceCategory;
  manufacturer: string;
  model: string;
  description: string;
  version: string;
  capabilities: CapabilityDefinition[];
  protocolCapabilities: ProtocolCapabilities;
  defaultConfig: Record<string, unknown>;
  firmware?: {
    currentVersion: string;
    latestVersion: string;
    updateUrl?: string;
    checksumAlgorithm?: string;
  };
  hardware?: {
    cpu?: string;
    memory?: string;
    storage?: string;
    interfaces?: string[];
    powerSource?: string;
    operatingTemp?: { min: number; max: number; unit: string };
    dimensions?: { width: number; height: number; depth: number; unit: string };
    weight?: { value: number; unit: string };
    ipRating?: string;
  };
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

// -----------------------------------------------------------------------------
// Device Template
// -----------------------------------------------------------------------------

export interface DeviceTemplate {
  id: string;
  name: string;
  description: string;
  deviceTypeId: string;
  category: DeviceCategory;
  tags: string[];
  defaultCapabilities: string[];
  defaultProtocol: Protocol;
  defaultConfig: Record<string, unknown>;
  metadata: Record<string, unknown>;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// -----------------------------------------------------------------------------
// Device Instance
// -----------------------------------------------------------------------------

export interface DeviceProvisioningInfo {
  deviceKey: string;
  deviceSecret: string;
  certificatePem?: string;
  privateKeyPem?: string;
  caCertificate?: string;
  provisionedAt: Date;
  expiresAt?: Date;
}

export interface DeviceFirmware {
  currentVersion: string;
  targetVersion?: string;
  lastUpdateCheck: Date;
  lastUpdateAttempt?: Date;
  updateStatus: 'current' | 'available' | 'updating' | 'failed';
  updateProgress?: number;
  rollbackVersion?: string;
}

export interface DeviceHealth {
  status: DeviceStatus;
  lastSeen: Date;
  lastHeartbeat?: Date;
  uptime: number; // seconds
  signalStrength?: number; // dBm or percentage
  batteryLevel?: number; // percentage
  cpuUsage?: number; // percentage
  memoryUsage?: number; // percentage
  storageUsage?: number; // percentage
  temperature?: number;
  errorCount: number;
  warningCount: number;
  healthScore: number; // 0-100
}

export interface DeviceLocation {
  latitude?: number;
  longitude?: number;
  altitude?: number;
  accuracy?: number;
  address?: string;
  building?: string;
  floor?: number;
  room?: string;
  zone?: string;
}

export interface Device {
  id: string;
  name: string;
  displayName: string;
  description: string;
  deviceTypeId: string;
  category: DeviceCategory;
  status: DeviceStatus;
  serialNumber: string;
  macAddress?: string;
  ipAddress?: string;
  provisioning: DeviceProvisioningInfo;
  firmware: DeviceFirmware;
  health: DeviceHealth;
  location?: DeviceLocation;
  capabilities: DeviceCapability[];
  protocolConfigs: ProtocolConfig[];
  groups: string[];
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

export interface DeviceGroup {
  id: string;
  name: string;
  description: string;
  parentId?: string;
  deviceTypeIds: string[];
  deviceIds: string[];
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// -----------------------------------------------------------------------------
// Registry - Predefined Device Types
// -----------------------------------------------------------------------------

const DEFAULT_CAPABILITIES: Record<string, CapabilityDefinition> = {
  [CapabilityType.TEMPERATURE]: {
    type: CapabilityType.TEMPERATURE,
    name: 'Temperature',
    description: 'Ambient temperature reading',
    unit: '°C',
    minValue: -40,
    maxValue: 85,
    decimalPlaces: 2,
    readingInterval: { value: 10, unit: FrequencyUnit.SECONDS },
    writable: false,
    readable: true,
    notifyOnChange: true,
    changeThreshold: 0.5,
  },
  [CapabilityType.HUMIDITY]: {
    type: CapabilityType.HUMIDITY,
    name: 'Humidity',
    description: 'Relative humidity reading',
    unit: '%',
    minValue: 0,
    maxValue: 100,
    decimalPlaces: 1,
    readingInterval: { value: 10, unit: FrequencyUnit.SECONDS },
    writable: false,
    readable: true,
    notifyOnChange: true,
    changeThreshold: 1,
  },
  [CapabilityType.PRESSURE]: {
    type: CapabilityType.PRESSURE,
    name: 'Pressure',
    description: 'Atmospheric pressure reading',
    unit: 'hPa',
    minValue: 300,
    maxValue: 1100,
    decimalPlaces: 1,
    readingInterval: { value: 60, unit: FrequencyUnit.SECONDS },
    writable: false,
    readable: true,
    notifyOnChange: true,
    changeThreshold: 0.5,
  },
  [CapabilityType.LIGHT]: {
    type: CapabilityType.LIGHT,
    name: 'Light Level',
    description: 'Ambient light level reading',
    unit: 'lux',
    minValue: 0,
    maxValue: 100000,
    decimalPlaces: 0,
    readingInterval: { value: 5, unit: FrequencyUnit.SECONDS },
    writable: false,
    readable: true,
    notifyOnChange: true,
    changeThreshold: 10,
  },
  [CapabilityType.MOTION]: {
    type: CapabilityType.MOTION,
    name: 'Motion',
    description: 'Motion detection',
    unit: 'boolean',
    readingInterval: { value: 1, unit: FrequencyUnit.SECONDS },
    writable: false,
    readable: true,
    notifyOnChange: true,
  },
  [CapabilityType.GPS]: {
    type: CapabilityType.GPS,
    name: 'GPS Location',
    description: 'GPS coordinates',
    unit: 'coordinates',
    readingInterval: { value: 30, unit: FrequencyUnit.SECONDS },
    writable: false,
    readable: true,
    notifyOnChange: true,
    dataPoints: ['latitude', 'longitude', 'altitude', 'speed', 'heading'],
  },
  [CapabilityType.BATTERY]: {
    type: CapabilityType.BATTERY,
    name: 'Battery Level',
    description: 'Battery charge level',
    unit: '%',
    minValue: 0,
    maxValue: 100,
    decimalPlaces: 0,
    readingInterval: { value: 300, unit: FrequencyUnit.SECONDS },
    writable: false,
    readable: true,
    notifyOnChange: true,
    changeThreshold: 5,
  },
  [CapabilityType.SIGNAL_STRENGTH]: {
    type: CapabilityType.SIGNAL_STRENGTH,
    name: 'Signal Strength',
    description: 'Wireless signal strength',
    unit: 'dBm',
    minValue: -120,
    maxValue: 0,
    decimalPlaces: 0,
    readingInterval: { value: 60, unit: FrequencyUnit.SECONDS },
    writable: false,
    readable: true,
    notifyOnChange: true,
    changeThreshold: 5,
  },
  [CapabilityType.VIBRATION]: {
    type: CapabilityType.VIBRATION,
    name: 'Vibration',
    description: 'Vibration level reading',
    unit: 'mm/s',
    minValue: 0,
    maxValue: 100,
    decimalPlaces: 2,
    readingInterval: { value: 1, unit: FrequencyUnit.SECONDS },
    writable: false,
    readable: true,
    notifyOnChange: true,
    changeThreshold: 0.5,
  },
  [CapabilityType.GAS]: {
    type: CapabilityType.GAS,
    name: 'Gas Level',
    description: 'Gas concentration reading',
    unit: 'ppm',
    minValue: 0,
    maxValue: 10000,
    decimalPlaces: 0,
    readingInterval: { value: 10, unit: FrequencyUnit.SECONDS },
    writable: false,
    readable: true,
    notifyOnChange: true,
    changeThreshold: 10,
  },
  [CapabilityType.POWER_CONSUMPTION]: {
    type: CapabilityType.POWER_CONSUMPTION,
    name: 'Power Consumption',
    description: 'Electrical power usage',
    unit: 'W',
    minValue: 0,
    maxValue: 50000,
    decimalPlaces: 1,
    readingInterval: { value: 5, unit: FrequencyUnit.SECONDS },
    writable: false,
    readable: true,
    notifyOnChange: true,
    changeThreshold: 10,
  },
  [CapabilityType.VOLTAGE]: {
    type: CapabilityType.VOLTAGE,
    name: 'Voltage',
    description: 'Electrical voltage',
    unit: 'V',
    minValue: 0,
    maxValue: 480,
    decimalPlaces: 2,
    readingInterval: { value: 5, unit: FrequencyUnit.SECONDS },
    writable: false,
    readable: true,
    notifyOnChange: true,
    changeThreshold: 1,
  },
  [CapabilityType.CURRENT]: {
    type: CapabilityType.CURRENT,
    name: 'Current',
    description: 'Electrical current',
    unit: 'A',
    minValue: 0,
    maxValue: 500,
    decimalPlaces: 2,
    readingInterval: { value: 5, unit: FrequencyUnit.SECONDS },
    writable: false,
    readable: true,
    notifyOnChange: true,
    changeThreshold: 0.5,
  },
  [CapabilityType.DIGITAL_IO]: {
    type: CapabilityType.DIGITAL_IO,
    name: 'Digital I/O',
    description: 'Digital input/output pin',
    unit: 'boolean',
    readingInterval: { value: 1, unit: FrequencyUnit.SECONDS },
    writable: true,
    readable: true,
    notifyOnChange: true,
  },
  [CapabilityType.ANALOG_IO]: {
    type: CapabilityType.ANALOG_IO,
    name: 'Analog I/O',
    description: 'Analog input/output',
    unit: 'value',
    minValue: 0,
    maxValue: 4095,
    decimalPlaces: 0,
    readingInterval: { value: 1, unit: FrequencyUnit.SECONDS },
    writable: true,
    readable: true,
    notifyOnChange: true,
  },
  [CapabilityType.SOUND]: {
    type: CapabilityType.SOUND,
    name: 'Sound Level',
    description: 'Sound level measurement',
    unit: 'dB',
    minValue: 0,
    maxValue: 140,
    decimalPlaces: 1,
    readingInterval: { value: 1, unit: FrequencyUnit.SECONDS },
    writable: false,
    readable: true,
    notifyOnChange: true,
    changeThreshold: 3,
  },
};

const PROTOCOL_CAPABILITIES: Record<Protocol, Partial<ProtocolCapabilities>> = {
  [Protocol.MQTT]: {
    supportedProtocols: [Protocol.MQTT],
    preferredProtocol: Protocol.MQTT,
    supportedFormats: [DataFormat.JSON, DataFormat.CBOR, DataFormat.PROTOBUF, DataFormat.BINARY],
    maxPayloadSize: 256 * 1024,
    supportsBidirectional: true,
    supportsBinary: true,
    supportsRetainedMessages: true,
    supportsLastWill: true,
    maxConnections: 100000,
    heartbeatInterval: 60,
  },
  [Protocol.HTTP]: {
    supportedProtocols: [Protocol.HTTP],
    preferredProtocol: Protocol.HTTP,
    supportedFormats: [DataFormat.JSON, DataFormat.XML, DataFormat.CSV, DataFormat.PROTOBUF],
    maxPayloadSize: 10 * 1024 * 1024,
    supportsBidirectional: false,
    supportsBinary: true,
    supportsRetainedMessages: false,
    supportsLastWill: false,
    heartbeatInterval: 30,
  },
  [Protocol.WEBSOCKET]: {
    supportedProtocols: [Protocol.WEBSOCKET],
    preferredProtocol: Protocol.WEBSOCKET,
    supportedFormats: [DataFormat.JSON, DataFormat.CBOR, DataFormat.BINARY],
    maxPayloadSize: 64 * 1024,
    supportsBidirectional: true,
    supportsBinary: true,
    supportsRetainedMessages: false,
    supportsLastWill: false,
    heartbeatInterval: 30,
  },
  [Protocol.COAP]: {
    supportedProtocols: [Protocol.COAP],
    preferredProtocol: Protocol.COAP,
    supportedFormats: [DataFormat.CBOR, DataFormat.JSON, DataFormat.XML],
    maxPayloadSize: 1024,
    supportsBidirectional: true,
    supportsBinary: true,
    supportsRetainedMessages: false,
    supportsLastWill: false,
    heartbeatInterval: 60,
  },
  [Protocol.LORA]: {
    supportedProtocols: [Protocol.LORA],
    preferredProtocol: Protocol.LORA,
    supportedFormats: [DataFormat.BINARY],
    maxPayloadSize: 51,
    supportsBidirectional: false,
    supportsBinary: true,
    supportsRetainedMessages: false,
    supportsLastWill: false,
    heartbeatInterval: 300,
  },
  [Protocol.ZIGBEE]: {
    supportedProtocols: [Protocol.ZIGBEE],
    preferredProtocol: Protocol.ZIGBEE,
    supportedFormats: [DataFormat.BINARY],
    maxPayloadSize: 128,
    supportsBidirectional: true,
    supportsBinary: true,
    supportsRetainedMessages: false,
    supportsLastWill: false,
    heartbeatInterval: 30,
  },
  [Protocol.BLUETOOTH]: {
    supportedProtocols: [Protocol.BLUETOOTH],
    preferredProtocol: Protocol.BLUETOOTH,
    supportedFormats: [DataFormat.BINARY],
    maxPayloadSize: 512,
    supportsBidirectional: true,
    supportsBinary: true,
    supportsRetainedMessages: false,
    supportsLastWill: false,
    heartbeatInterval: 30,
  },
  [Protocol.TCP]: {
    supportedProtocols: [Protocol.TCP],
    preferredProtocol: Protocol.TCP,
    supportedFormats: [DataFormat.JSON, DataFormat.CSV, DataFormat.BINARY, DataFormat.XML],
    maxPayloadSize: 1024 * 1024,
    supportsBidirectional: true,
    supportsBinary: true,
    supportsRetainedMessages: false,
    supportsLastWill: false,
    heartbeatInterval: 30,
  },
  [Protocol.UDP]: {
    supportedProtocols: [Protocol.UDP],
    preferredProtocol: Protocol.UDP,
    supportedFormats: [DataFormat.JSON, DataFormat.BINARY],
    maxPayloadSize: 65507,
    supportsBidirectional: true,
    supportsBinary: true,
    supportsRetainedMessages: false,
    supportsLastWill: false,
    heartbeatInterval: 30,
  },
  [Protocol.MODBUS]: {
    supportedProtocols: [Protocol.MODBUS],
    preferredProtocol: Protocol.MODBUS,
    supportedFormats: [DataFormat.BINARY],
    maxPayloadSize: 256,
    supportsBidirectional: true,
    supportsBinary: true,
    supportsRetainedMessages: false,
    supportsLastWill: false,
    heartbeatInterval: 10,
  },
};

// -----------------------------------------------------------------------------
// Device Type Registry
// -----------------------------------------------------------------------------

const DEVICE_TYPES: DeviceTypeDefinition[] = [
  {
    id: 'type-temp-humidity-sensor',
    name: 'Temperature & Humidity Sensor',
    category: DeviceCategory.SENSOR,
    manufacturer: 'Generic',
    model: 'TH-2000',
    description: 'Indoor temperature and humidity sensor with high accuracy',
    version: '1.0.0',
    capabilities: [
      DEFAULT_CAPABILITIES[CapabilityType.TEMPERATURE],
      DEFAULT_CAPABILITIES[CapabilityType.HUMIDITY],
      DEFAULT_CAPABILITIES[CapabilityType.BATTERY],
      DEFAULT_CAPABILITIES[CapabilityType.SIGNAL_STRENGTH],
    ],
    protocolCapabilities: PROTOCOL_CAPABILITIES[Protocol.MQTT],
    defaultConfig: {
      sampleRate: 10,
      unit: 'celsius',
      precision: 0.1,
      alertThresholds: { temperatureMin: 0, temperatureMax: 40, humidityMin: 20, humidityMax: 80 },
    },
    firmware: {
      currentVersion: '2.1.3',
      latestVersion: '2.1.4',
      checksumAlgorithm: 'sha256',
    },
    hardware: {
      cpu: 'ARM Cortex-M4',
      memory: '256KB',
      storage: '1MB Flash',
      interfaces: ['WiFi', 'BLE'],
      powerSource: 'Battery (CR2032)',
      operatingTemp: { min: -20, max: 60, unit: '°C' },
      dimensions: { width: 50, height: 30, depth: 15, unit: 'mm' },
      weight: { value: 25, unit: 'g' },
      ipRating: 'IP54',
    },
    tags: ['indoor', 'environment', 'temperature', 'humidity', 'battery-powered'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-06-15'),
  },
  {
    id: 'type-motion-detector',
    name: 'Motion Detector',
    category: DeviceCategory.SENSOR,
    manufacturer: 'Generic',
    model: 'MD-1000',
    description: 'PIR motion detection sensor',
    version: '1.0.0',
    capabilities: [
      DEFAULT_CAPABILITIES[CapabilityType.MOTION],
      DEFAULT_CAPABILITIES[CapabilityType.LIGHT],
      DEFAULT_CAPABILITIES[CapabilityType.BATTERY],
      DEFAULT_CAPABILITIES[CapabilityType.SIGNAL_STRENGTH],
    ],
    protocolCapabilities: PROTOCOL_CAPABILITIES[Protocol.MQTT],
    defaultConfig: {
      sensitivity: 'medium',
      detectionRange: 12,
      cooldownPeriod: 30,
      nightMode: false,
    },
    firmware: {
      currentVersion: '1.5.0',
      latestVersion: '1.5.2',
      checksumAlgorithm: 'sha256',
    },
    hardware: {
      interfaces: ['WiFi', 'Zigbee'],
      powerSource: 'Battery (2x AA)',
      operatingTemp: { min: -10, max: 50, unit: '°C' },
      ipRating: 'IP44',
    },
    tags: ['indoor', 'security', 'motion', 'battery-powered'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-06-15'),
  },
  {
    id: 'type-gps-tracker',
    name: 'GPS Tracker',
    category: DeviceCategory.SENSOR,
    manufacturer: 'Generic',
    model: 'GPS-500',
    description: 'Vehicle/personnel GPS tracking device',
    version: '1.0.0',
    capabilities: [
      DEFAULT_CAPABILITIES[CapabilityType.GPS],
      DEFAULT_CAPABILITIES[CapabilityType.SPEED],
      DEFAULT_CAPABILITIES[CapabilityType.BATTERY],
      DEFAULT_CAPABILITIES[CapabilityType.SIGNAL_STRENGTH],
      DEFAULT_CAPABILITIES[CapabilityType.ACCELEROMETER],
    ],
    protocolCapabilities: PROTOCOL_CAPABILITIES[Protocol.HTTP],
    defaultConfig: {
      updateInterval: 10,
      sleepMode: false,
      geofencing: true,
      tripDetection: true,
    },
    firmware: {
      currentVersion: '3.0.1',
      latestVersion: '3.1.0',
      checksumAlgorithm: 'sha256',
    },
    hardware: {
      cpu: 'ARM Cortex-M33',
      memory: '512KB',
      storage: '4MB Flash',
      interfaces: ['4G LTE', 'GPS', 'BLE'],
      powerSource: 'Rechargeable Li-Po 1000mAh',
      operatingTemp: { min: -20, max: 70, unit: '°C' },
      ipRating: 'IP67',
    },
    tags: ['outdoor', 'tracking', 'vehicle', 'personnel', 'gps'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-06-15'),
  },
  {
    id: 'type-industrial-gateway',
    name: 'Industrial Gateway',
    category: DeviceCategory.GATEWAY,
    manufacturer: 'Generic',
    model: 'GW-3000',
    description: 'Industrial IoT gateway for protocol translation',
    version: '1.0.0',
    capabilities: [
      DEFAULT_CAPABILITIES[CapabilityType.SIGNAL_STRENGTH],
      DEFAULT_CAPABILITIES[CapabilityType.BATTERY],
      DEFAULT_CAPABILITIES[CapabilityType.TEMPERATURE],
    ],
    protocolCapabilities: {
      supportedProtocols: [Protocol.MQTT, Protocol.HTTP, Protocol.WEBSOCKET, Protocol.MODBUS, Protocol.TCP],
      preferredProtocol: Protocol.MQTT,
      supportedFormats: [DataFormat.JSON, DataFormat.CBOR, DataFormat.PROTOBUF, DataFormat.BINARY, DataFormat.XML],
      maxPayloadSize: 10 * 1024 * 1024,
      supportsBidirectional: true,
      supportsBinary: true,
      supportsRetainedMessages: true,
      supportsLastWill: true,
      maxConnections: 500,
    },
    defaultConfig: {
      maxDevices: 256,
      protocolTranslation: true,
      edgeProcessing: true,
      bufferingEnabled: true,
      bufferSize: 10000,
    },
    firmware: {
      currentVersion: '4.2.0',
      latestVersion: '4.3.1',
      checksumAlgorithm: 'sha256',
    },
    hardware: {
      cpu: 'ARM Cortex-A53 Quad Core',
      memory: '2GB DDR4',
      storage: '16GB eMMC',
      interfaces: ['Ethernet', 'WiFi', 'BLE', 'RS485', 'RS232', 'GPIO', '4G LTE'],
      powerSource: 'PoE / DC 12-24V',
      operatingTemp: { min: -40, max: 85, unit: '°C' },
      ipRating: 'IP65',
    },
    tags: ['industrial', 'gateway', 'edge', 'protocol-translation'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-06-15'),
  },
  {
    id: 'type-smart-plug',
    name: 'Smart Plug',
    category: DeviceCategory.ACTUATOR,
    manufacturer: 'Generic',
    model: 'SP-100',
    description: 'WiFi-enabled smart power plug with energy monitoring',
    version: '1.0.0',
    capabilities: [
      DEFAULT_CAPABILITIES[CapabilityType.POWER_CONSUMPTION],
      DEFAULT_CAPABILITIES[CapabilityType.VOLTAGE],
      DEFAULT_CAPABILITIES[CapabilityType.CURRENT],
      DEFAULT_CAPABILITIES[CapabilityType.DIGITAL_IO],
      DEFAULT_CAPABILITIES[CapabilityType.TEMPERATURE],
      DEFAULT_CAPABILITIES[CapabilityType.SIGNAL_STRENGTH],
    ],
    protocolCapabilities: PROTOCOL_CAPABILITIES[Protocol.MQTT],
    defaultConfig: {
      maxPower: 3500,
      autoOff: false,
      scheduleEnabled: false,
      energyTracking: true,
    },
    firmware: {
      currentVersion: '1.2.0',
      latestVersion: '1.2.1',
      checksumAlgorithm: 'sha256',
    },
    hardware: {
      interfaces: ['WiFi'],
      powerSource: 'AC Mains',
      operatingTemp: { min: 0, max: 40, unit: '°C' },
      ipRating: 'IP20',
    },
    tags: ['indoor', 'smart-home', 'energy', 'actuator'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-06-15'),
  },
  {
    id: 'type-industrial-sensor',
    name: 'Industrial Vibration Sensor',
    category: DeviceCategory.SENSOR,
    manufacturer: 'Generic',
    model: 'VS-500',
    description: 'High-precision industrial vibration sensor for predictive maintenance',
    version: '1.0.0',
    capabilities: [
      DEFAULT_CAPABILITIES[CapabilityType.VIBRATION],
      DEFAULT_CAPABILITIES[CapabilityType.TEMPERATURE],
      DEFAULT_CAPABILITIES[CapabilityType.SIGNAL_STRENGTH],
    ],
    protocolCapabilities: PROTOCOL_CAPABILITIES[Protocol.MQTT],
    defaultConfig: {
      sampleRate: 1000,
      range: '±16g',
      bandwidth: '10kHz',
      envelopeAnalysis: true,
    },
    firmware: {
      currentVersion: '2.0.0',
      latestVersion: '2.1.0',
      checksumAlgorithm: 'sha256',
    },
    hardware: {
      cpu: 'ARM Cortex-M7',
      memory: '512KB',
      storage: '2MB Flash',
      interfaces: ['WiFi', 'LoRa', '4-20mA', 'Modbus'],
      powerSource: '4-20mA Loop / Battery',
      operatingTemp: { min: -40, max: 125, unit: '°C' },
      ipRating: 'IP68',
    },
    tags: ['industrial', 'vibration', 'predictive-maintenance', 'rugged'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-06-15'),
  },
  {
    id: 'type-air-quality',
    name: 'Air Quality Monitor',
    category: DeviceCategory.SENSOR,
    manufacturer: 'Generic',
    model: 'AQ-200',
    description: 'Multi-gas air quality monitoring sensor',
    version: '1.0.0',
    capabilities: [
      DEFAULT_CAPABILITIES[CapabilityType.GAS],
      DEFAULT_CAPABILITIES[CapabilityType.TEMPERATURE],
      DEFAULT_CAPABILITIES[CapabilityType.HUMIDITY],
      DEFAULT_CAPABILITIES[CapabilityType.PRESSURE],
      DEFAULT_CAPABILITIES[CapabilityType.LIGHT],
      DEFAULT_CAPABILITIES[CapabilityType.BATTERY],
      DEFAULT_CAPABILITIES[CapabilityType.SIGNAL_STRENGTH],
    ],
    protocolCapabilities: PROTOCOL_CAPABILITIES[Protocol.MQTT],
    defaultConfig: {
      gases: ['CO2', 'CO', 'NO2', 'SO2', 'O3', 'PM2.5', 'PM10'],
      sampleRate: 30,
      calibrationEnabled: true,
    },
    firmware: {
      currentVersion: '1.3.0',
      latestVersion: '1.3.2',
      checksumAlgorithm: 'sha256',
    },
    hardware: {
      interfaces: ['WiFi', 'BLE'],
      powerSource: 'USB-C / Battery',
      operatingTemp: { min: -10, max: 50, unit: '°C' },
      ipRating: 'IP44',
    },
    tags: ['indoor', 'outdoor', 'environment', 'air-quality', 'pollution'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-06-15'),
  },
  {
    id: 'type-smart-camera',
    name: 'Smart Camera',
    category: DeviceCategory.CAMERA,
    manufacturer: 'Generic',
    model: 'SC-400',
    description: 'AI-enabled smart security camera with edge processing',
    version: '1.0.0',
    capabilities: [
      DEFAULT_CAPABILITIES[CapabilityType.MOTION],
      DEFAULT_CAPABILITIES[CapabilityType.LIGHT],
      DEFAULT_CAPABILITIES[CapabilityType.SOUND],
      DEFAULT_CAPABILITIES[CapabilityType.TEMPERATURE],
      DEFAULT_CAPABILITIES[CapabilityType.SIGNAL_STRENGTH],
    ],
    protocolCapabilities: PROTOCOL_CAPABILITIES[Protocol.WEBSOCKET],
    defaultConfig: {
      resolution: '1920x1080',
      fps: 30,
      nightVision: true,
      motionDetection: true,
      faceDetection: true,
      aiProcessing: true,
    },
    firmware: {
      currentVersion: '5.0.0',
      latestVersion: '5.1.2',
      checksumAlgorithm: 'sha256',
    },
    hardware: {
      cpu: 'ARM Cortex-A72 Quad Core',
      memory: '2GB DDR4',
      storage: '32GB eMMC + microSD',
      interfaces: ['WiFi', 'Ethernet', 'PoE', 'USB'],
      powerSource: 'PoE / DC 12V',
      operatingTemp: { min: -20, max: 50, unit: '°C' },
      ipRating: 'IP66',
    },
    tags: ['outdoor', 'security', 'camera', 'ai', 'edge-processing'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-06-15'),
  },
];

// -----------------------------------------------------------------------------
// Device Templates
// -----------------------------------------------------------------------------

const DEVICE_TEMPLATES: DeviceTemplate[] = [
  {
    id: 'tpl-office-sensor',
    name: 'Office Environment Sensor',
    description: 'Standard office environment monitoring setup',
    deviceTypeId: 'type-temp-humidity-sensor',
    category: DeviceCategory.SENSOR,
    tags: ['office', 'environment'],
    defaultCapabilities: ['temperature', 'humidity', 'battery', 'signal_strength'],
    defaultProtocol: Protocol.MQTT,
    defaultConfig: {
      sampleRate: 30,
      alertThresholds: { temperatureMin: 18, temperatureMax: 26, humidityMin: 30, humidityMax: 60 },
    },
    metadata: { department: 'facilities', priority: 'medium' },
    usageCount: 156,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-06-01'),
  },
  {
    id: 'tpl-warehouse-monitor',
    name: 'Warehouse Monitoring Kit',
    description: 'Complete warehouse environment and security monitoring',
    deviceTypeId: 'type-temp-humidity-sensor',
    category: DeviceCategory.SENSOR,
    tags: ['warehouse', 'logistics', 'cold-chain'],
    defaultCapabilities: ['temperature', 'humidity', 'motion', 'battery'],
    defaultProtocol: Protocol.MQTT,
    defaultConfig: {
      sampleRate: 10,
      alertThresholds: { temperatureMin: 2, temperatureMax: 8, humidityMin: 40, humidityMax: 70 },
      coldChainMonitoring: true,
    },
    metadata: { department: 'logistics', priority: 'high' },
    usageCount: 89,
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-06-15'),
  },
  {
    id: 'tpl-fleet-tracking',
    name: 'Fleet Tracking Setup',
    description: 'Vehicle fleet GPS tracking configuration',
    deviceTypeId: 'type-gps-tracker',
    category: DeviceCategory.SENSOR,
    tags: ['fleet', 'vehicle', 'tracking'],
    defaultCapabilities: ['gps', 'signal_strength', 'battery'],
    defaultProtocol: Protocol.HTTP,
    defaultConfig: {
      updateInterval: 15,
      geofencing: true,
      tripDetection: true,
      idlingDetection: true,
    },
    metadata: { department: 'logistics', priority: 'high' },
    usageCount: 234,
    createdAt: new Date('2024-02-15'),
    updatedAt: new Date('2024-06-10'),
  },
  {
    id: 'tpl-predictive-maintenance',
    name: 'Predictive Maintenance Kit',
    description: 'Industrial vibration and temperature monitoring for predictive maintenance',
    deviceTypeId: 'type-industrial-sensor',
    category: DeviceCategory.SENSOR,
    tags: ['industrial', 'maintenance', 'vibration'],
    defaultCapabilities: ['vibration', 'temperature', 'signal_strength'],
    defaultProtocol: Protocol.MQTT,
    defaultConfig: {
      sampleRate: 1000,
      alertThresholds: { vibrationMax: 7.1, temperatureMax: 80 },
      envelopeAnalysis: true,
    },
    metadata: { department: 'operations', priority: 'critical' },
    usageCount: 67,
    createdAt: new Date('2024-04-01'),
    updatedAt: new Date('2024-06-20'),
  },
  {
    id: 'tpl-smart-home',
    name: 'Smart Home Starter',
    description: 'Basic smart home device configuration',
    deviceTypeId: 'type-smart-plug',
    category: DeviceCategory.ACTUATOR,
    tags: ['smart-home', 'consumer'],
    defaultCapabilities: ['power_consumption', 'voltage', 'current', 'digital_io'],
    defaultProtocol: Protocol.MQTT,
    defaultConfig: {
      energyTracking: true,
      scheduleEnabled: false,
      voiceControl: true,
    },
    metadata: { department: 'consumer', priority: 'low' },
    usageCount: 312,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-06-01'),
  },
];

// -----------------------------------------------------------------------------
// Registry Manager
// -----------------------------------------------------------------------------

export class DeviceRegistry {
  private deviceTypes: Map<string, DeviceTypeDefinition> = new Map();
  private templates: Map<string, DeviceTemplate> = new Map();
  private protocolConfigs: Map<Protocol, ProtocolCapabilities> = new Map();

  constructor() {
    this.initializeRegistry();
  }

  private initializeRegistry(): void {
    for (const deviceType of DEVICE_TYPES) {
      this.deviceTypes.set(deviceType.id, deviceType);
    }
    for (const template of DEVICE_TEMPLATES) {
      this.templates.set(template.id, template);
    }
    for (const [protocol, config] of Object.entries(PROTOCOL_CAPABILITIES)) {
      this.protocolConfigs.set(protocol as Protocol, config as ProtocolCapabilities);
    }
  }

  // -- Device Types --
  getAllDeviceTypes(): DeviceTypeDefinition[] {
    return Array.from(this.deviceTypes.values());
  }

  getDeviceType(id: string): DeviceTypeDefinition | undefined {
    return this.deviceTypes.get(id);
  }

  getDeviceTypesByCategory(category: DeviceCategory): DeviceTypeDefinition[] {
    return this.getAllDeviceTypes().filter(dt => dt.category === category);
  }

  getDeviceTypesByTag(tag: string): DeviceTypeDefinition[] {
    return this.getAllDeviceTypes().filter(dt => dt.tags.includes(tag));
  }

  registerDeviceType(definition: Omit<DeviceTypeDefinition, 'id' | 'createdAt' | 'updatedAt'>): DeviceTypeDefinition {
    const newType: DeviceTypeDefinition = {
      ...definition,
      id: `type-${uuidv4().substring(0, 8)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.deviceTypes.set(newType.id, newType);
    return newType;
  }

  updateDeviceType(id: string, updates: Partial<DeviceTypeDefinition>): DeviceTypeDefinition | undefined {
    const existing = this.deviceTypes.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.deviceTypes.set(id, updated);
    return updated;
  }

  deleteDeviceType(id: string): boolean {
    return this.deviceTypes.delete(id);
  }

  // -- Templates --
  getAllTemplates(): DeviceTemplate[] {
    return Array.from(this.templates.values());
  }

  getTemplate(id: string): DeviceTemplate | undefined {
    return this.templates.get(id);
  }

  getTemplatesByDeviceType(deviceTypeId: string): DeviceTemplate[] {
    return this.getAllTemplates().filter(t => t.deviceTypeId === deviceTypeId);
  }

  getTemplatesByCategory(category: DeviceCategory): DeviceTemplate[] {
    return this.getAllTemplates().filter(t => t.category === category);
  }

  createTemplate(template: Omit<DeviceTemplate, 'id' | 'usageCount' | 'createdAt' | 'updatedAt'>): DeviceTemplate {
    const newTemplate: DeviceTemplate = {
      ...template,
      id: `tpl-${uuidv4().substring(0, 8)}`,
      usageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.templates.set(newTemplate.id, newTemplate);
    return newTemplate;
  }

  updateTemplate(id: string, updates: Partial<DeviceTemplate>): DeviceTemplate | undefined {
    const existing = this.templates.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.templates.set(id, updated);
    return updated;
  }

  deleteTemplate(id: string): boolean {
    return this.templates.delete(id);
  }

  incrementTemplateUsage(id: string): void {
    const template = this.templates.get(id);
    if (template) {
      template.usageCount += 1;
      template.updatedAt = new Date();
    }
  }

  // -- Protocols --
  getProtocolCapabilities(protocol: Protocol): ProtocolCapabilities | undefined {
    return this.protocolConfigs.get(protocol);
  }

  getAllProtocolCapabilities(): ProtocolCapabilities[] {
    return Array.from(this.protocolConfigs.values());
  }

  // -- Capabilities --
  getCapabilityDefinition(type: CapabilityType): CapabilityDefinition | undefined {
    return DEFAULT_CAPABILITIES[type];
  }

  getAllCapabilityDefinitions(): CapabilityDefinition[] {
    return Object.values(DEFAULT_CAPABILITIES);
  }

  // -- Helpers --
  generateDeviceKey(): string {
    return `dk_${randomBytes(24).toString('hex')}`;
  }

  generateDeviceSecret(): string {
    return `ds_${randomBytes(32).toString('hex')}`;
  }

  generateSerialNumber(): string {
    const prefix = 'IOT';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = randomBytes(4).toString('hex').toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  generateMacAddress(): string {
    return randomBytes(6)
      .map(b => b.toString(16).padStart(2, '0').toUpperCase())
      .join(':');
  }

  hashApiKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }
}

// Singleton instance
let registryInstance: DeviceRegistry | null = null;

export function getDeviceRegistry(): DeviceRegistry {
  if (!registryInstance) {
    registryInstance = new DeviceRegistry();
  }
  return registryInstance;
}

export default DeviceRegistry;
