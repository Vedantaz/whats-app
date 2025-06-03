import type { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center py-6 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 20 20" fill="currentColor" className="text-green-500 flex-shrink-0">
                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white drop-shadow-md">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-2 text-white text-opacity-90">
              {subtitle}
            </p>
          )}
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-xl shadow-2xl p-8 border border-gray-100">
          {children}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-white text-opacity-80">
          <p>© {new Date().getFullYear()} WhatsApp Clone. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
