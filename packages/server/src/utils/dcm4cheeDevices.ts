interface Destination {
  aeTitle: string
  host:    string
  port:    number
  name:    string
}

export async function ensureDestinationRegistered(dest: Destination, dcm4cheeBase: string): Promise<void> {
  try {
    const deviceName = dest.aeTitle.toLowerCase().replace(/[^a-z0-9-]/g, '-')

    // Check if the device is already registered (remote AETs are stored as devices, not local AETs)
    const deviceRes = await fetch(`${dcm4cheeBase}/dcm4chee-arc/devices/${deviceName}`, {
      signal: AbortSignal.timeout(5000),
    })
    if (deviceRes.ok) return // device already registered
    const devicePayload = {
      dicomDeviceName:  deviceName,
      dicomDescription: dest.name,
      dicomInstalled:   true,
      dicomNetworkConnection: [{
        cn:           'dicom',
        dicomHostname: dest.host,
        dicomPort:     dest.port,
      }],
      dicomNetworkAE: [{
        dicomAETitle:                      dest.aeTitle,
        dicomNetworkConnectionReference:   ['/dicomNetworkConnection/dicom'],
        dicomAssociationAcceptor:          true,
        dicomAssociationInitiator:         false,
      }],
    }

    await fetch(`${dcm4cheeBase}/dcm4chee-arc/devices/${deviceName}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(devicePayload),
      signal:  AbortSignal.timeout(5000),
    })
  } catch {
    // Non-fatal — attempt the operation anyway; dcm4chee may already know the AET
  }
}
