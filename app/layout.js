import './globals.css';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';

export const metadata = {
  title: 'SIM SDM Pendamping',
  description: 'Sistem informasi data SDM dan desa dampingan',
  manifest: '/manifest.json',
};

export const viewport = {
  themeColor: '#1a56b0',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className="font-sans min-h-screen">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
