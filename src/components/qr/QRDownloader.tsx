import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

interface QRDownloaderProps {
  url: string
  apartmentName: string
}

export default function QRDownloader({ url, apartmentName }: QRDownloaderProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    QRCode.toDataURL(url, {
      width: 512,
      margin: 2,
      color: { dark: '#1a6b4a', light: '#ffffff' },
    }).then(setDataUrl)
  }, [url])

  const downloadPNG = () => {
    if (!dataUrl) return
    const link = document.createElement('a')
    link.download = `${apartmentName.replace(/\s+/g, '-').toLowerCase()}-qr.png`
    link.href = dataUrl
    link.click()
  }

  const downloadSVG = async () => {
    const svg = await QRCode.toString(url, {
      type: 'svg',
      width: 512,
      margin: 2,
      color: { dark: '#1a6b4a', light: '#ffffff' },
    })
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const svgUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = `${apartmentName.replace(/\s+/g, '-').toLowerCase()}-qr.svg`
    link.href = svgUrl
    link.click()
    URL.revokeObjectURL(svgUrl)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-sm">
      {dataUrl ? (
        <img src={dataUrl} alt="QR Code" className="w-full rounded-lg mb-4" />
      ) : (
        <div className="w-full aspect-square bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
          <span className="text-gray-400">Generating...</span>
        </div>
      )}

      <p className="text-xs text-gray-500 mb-4 text-center break-all">{url}</p>

      <div className="flex gap-3">
        <button
          onClick={downloadPNG}
          disabled={!dataUrl}
          className="flex-1 py-2 text-sm font-medium bg-[#1a6b4a] text-white rounded-lg hover:bg-[#145538] disabled:opacity-50 transition-colors"
        >
          Download PNG
        </button>
        <button
          onClick={downloadSVG}
          className="flex-1 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Download SVG
        </button>
      </div>
    </div>
  )
}
