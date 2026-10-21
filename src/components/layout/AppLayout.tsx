import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex bg-[#faf7f2] text-[#2c2623] font-sans selection:bg-[#ebd8be] selection:text-[#2c2623]">
      <div className="flex-1 flex overflow-hidden">
        {/* Warm Beige Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <Topbar />
          <main className="flex-1 p-6 max-w-6xl w-full mx-auto space-y-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};
