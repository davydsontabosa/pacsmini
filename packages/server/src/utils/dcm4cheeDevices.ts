interface Destination {
  aeTitle: string
  host:    string
  port:    number
  name:    string
}

export async function ensureDestinationRegistered(
  dest: Destination,
  dcm4cheeBase: string,
  credentials?: { user: string; pass: string },
): Promise<void> {
  try {
    const deviceName = dest.aeTitle.toLowerCase().replace(/[^a-z0-9-]/g, '-')
    const authHeader = credentials
      ? { Authorization: `Basic ${Buffer.from(`${credentials.user}:${credentials.pass}`).toString('base64')}` }
      : {}

    const deviceRes = await fetch(`${dcm4cheeBase}/dcm4chee-arc/devices/${deviceName}`, {
      headers: authHeader,
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
        dicomNetworkConnectionReference:   ['/dicomNetworkConnection/0'],
        dicomAssociationAcceptor:          true,
        dicomAssociationInitiator:         false,
      }],
    }

    await fetch(`${dcm4cheeBase}/dcm4chee-arc/devices/${deviceName}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body:    JSON.stringify(devicePayload),
      signal:  AbortSignal.timeout(5000),
    })
  } catch {
    // Non-fatal — attempt the operation anyway; dcm4chee may already know the AET
  }
}
