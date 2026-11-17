import type {BluetoothPrinterState, PrinterSettings} from '../types/printer';

// Standard & common 58mm BLE thermal printer GATT service UUIDs
export const THERMAL_BLE_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard BLE thermal printer service
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Star / Goojprt / Rongta BLE serial
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC Transparent UART
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART Service (NUS)
  '0000fee7-0000-1000-8000-00805f9b34fb', // Generic thermal printer BLE
  '0000ff00-0000-1000-8000-00805f9b34fb', // Cat / PeriPage / Mini 58mm printers
  '0000ae30-0000-1000-8000-00805f9b34fb', // Generic ESC/POS BLE
];

interface BluetoothDeviceLike {
  id: string;
  name?: string;
  gatt?: {
    connected: boolean;
    connect: () => Promise<BluetoothRemoteGATTServerLike>;
    disconnect: () => void;
  };
  addEventListener: (type: string, listener: () => void) => void;
}

interface BluetoothRemoteGATTServerLike {
  device: BluetoothDeviceLike;
  connected: boolean;
  getPrimaryServices: () => Promise<BluetoothRemoteGATTServiceLike[]>;
}

interface BluetoothRemoteGATTServiceLike {
  uuid: string;
  getCharacteristics: () => Promise<BluetoothRemoteGATTCharacteristicLike[]>;
}

interface BluetoothRemoteGATTCharacteristicLike {
  uuid: string;
  properties: {
    write: boolean;
    writeWithoutResponse: boolean;
  };
  writeValue: (value: BufferSource) => Promise<void>;
  writeValueWithoutResponse?: (value: BufferSource) => Promise<void>;
  writeValueWithResponse?: (value: BufferSource) => Promise<void>;
}

let activeDevice: BluetoothDeviceLike | null = null;
let activeCharacteristic: BluetoothRemoteGATTCharacteristicLike | null = null;

export function isWebBluetoothSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'bluetooth' in navigator &&
    typeof (navigator as unknown as {bluetooth?: {requestDevice?: unknown}}).bluetooth
      ?.requestDevice === 'function'
  );
}

export async function connectBluetoothPrinter(
  onDisconnected: () => void,
): Promise<BluetoothPrinterState> {
  if (!isWebBluetoothSupported()) {
    throw new Error(
      'Web Bluetooth is not available in this browser. Use Chrome/Edge over HTTPS or localhost.',
    );
  }

  const bt = (
    navigator as unknown as {
      bluetooth: {
        requestDevice: (opts: unknown) => Promise<BluetoothDeviceLike>;
      };
    }
  ).bluetooth;

  const device = await bt.requestDevice({
    acceptAllDevices: true,
    optionalServices: THERMAL_BLE_SERVICES,
  });

  if (!device.gatt) {
    throw new Error('Selected Bluetooth device does not expose a GATT server.');
  }

  const server = await device.gatt.connect();
  const services = await server.getPrimaryServices();

  let foundServiceUuid: string | null = null;
  let foundCharacteristic: BluetoothRemoteGATTCharacteristicLike | null = null;

  for (const service of services) {
    const chars = await service.getCharacteristics();
    for (const ch of chars) {
      if (ch.properties.writeWithoutResponse || ch.properties.write) {
        foundServiceUuid = service.uuid;
        foundCharacteristic = ch;
        break;
      }
    }
    if (foundCharacteristic) break;
  }

  if (!foundCharacteristic) {
    device.gatt.disconnect();
    throw new Error(
      'No writable GATT characteristic found on this device. Confirm it is a BLE thermal printer.',
    );
  }

  activeDevice = device;
  activeCharacteristic = foundCharacteristic;

  device.addEventListener('gattserverdisconnected', () => {
    activeCharacteristic = null;
    onDisconnected();
  });

  return {
    supported: true,
    connected: true,
    connecting: false,
    deviceName: device.name || '58mm BLE Printer',
    deviceId: device.id,
    serviceUuid: foundServiceUuid,
    characteristicUuid: foundCharacteristic.uuid,
    lastError: null,
  };
}

export function disconnectBluetoothPrinter(): void {
  if (activeDevice?.gatt?.connected) {
    activeDevice.gatt.disconnect();
  }
  activeDevice = null;
  activeCharacteristic = null;
}

export function isPrinterConnected(): boolean {
  return Boolean(activeDevice?.gatt?.connected && activeCharacteristic);
}

export async function sendBytesToPrinter(
  data: Uint8Array,
  settings: Pick<PrinterSettings, 'chunkSizeBytes' | 'chunkDelayMs'>,
  onProgress?: (sentBytes: number, totalBytes: number) => void,
): Promise<void> {
  if (!activeCharacteristic || !activeDevice?.gatt?.connected) {
    throw new Error('Printer is disconnected. Connect via Web Bluetooth first.');
  }

  const chunkSize = Math.max(20, Math.min(512, settings.chunkSizeBytes || 100));
  const delayMs = Math.max(5, Math.min(100, settings.chunkDelayMs || 18));
  const total = data.length;

  for (let offset = 0; offset < total; offset += chunkSize) {
    const chunk = data.slice(offset, Math.min(offset + chunkSize, total));
    if (
      activeCharacteristic.properties.writeWithoutResponse &&
      activeCharacteristic.writeValueWithoutResponse
    ) {
      await activeCharacteristic.writeValueWithoutResponse(chunk);
    } else if (activeCharacteristic.writeValueWithResponse) {
      await activeCharacteristic.writeValueWithResponse(chunk);
    } else {
      await activeCharacteristic.writeValue(chunk);
    }

    onProgress?.(Math.min(offset + chunk.length, total), total);

    if (offset + chunkSize < total) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}
