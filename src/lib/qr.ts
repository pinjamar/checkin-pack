import QRCode from 'qrcode'

export async function generateQRDataURL(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    width: 512,
    margin: 2,
    color: {
      dark: '#1a6b4a',
      light: '#ffffff',
    },
  })
}

export async function generateQRSVG(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: 'svg',
    width: 512,
    margin: 2,
    color: {
      dark: '#1a6b4a',
      light: '#ffffff',
    },
  })
}
