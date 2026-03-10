import type { ReactNode } from "react";

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html>
      <body style={{ 
        margin: 0, 
        padding: 0,
        fontFamily: 'Arial, sans-serif'
      }}>
        {children}
      </body>
    </html>
  );
}
