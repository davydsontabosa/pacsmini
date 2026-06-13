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
    const authValue = credentials
      ? `Basic ${Buffer.from(`${credentials.user}:${credentials.pass}`).toString('base64')}`
      : null

    const baseHeaders: Record<string, string> = {}
    if (authValue) baseHeaders['Authorization'] = authValue

    const deviceRes = await fetch(`${dcm4cheeBase}/dcm4chee-arc/devices/${deviceName}`, {
      headers: baseHeaders,
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

    const putHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
    if (authValue) putHeaders['Authorization'] = authValue

    await fetch(`${dcm4cheeBase}/dcm4chee-arc/devices/${deviceName}`, {
      method:  'PUT',
      headers: putHeaders,
      body:    JSON.stringify(devicePayload),
      signal:  AbortSignal.timeout(5000),
    })
  } catch {
    // Non-fatal — attempt the operation anyway; dcm4chee may already know the AET
  }
}
