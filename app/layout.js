import './globals.css';

export const metadata = {
  title: 'SIM SDM Pendamping',
  description: 'Sistem informasi data SDM dan desa dampingan',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className="font-sans min-h-screen">{children}</body>
    </html>
  );
}
