import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export const AppLayout: React.FC = () => {
  return (
    <div className="h-screen w-screen overflow-hidden flex bg-[#F5F0E7] text-[#30291F] font-sans selection:bg-[#EBD8BE] selection:text-[#30291F] p-4 sm:p-5 gap-5 relative">
      {/* Ambient Warm Light Fields behind Interface for Genuine Glass Refraction */}
      <div className="fixed -top-24 -left-24 w-[520px] h-[520px] rounded-full bg-gradient-to-br from-[#EAD7C0]/70 via-[#E4CDAE]/45 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="fixed top-1/4 -right-24 w-[620px] h-[620px] rounded-full bg-gradient-to-bl from-[#E8CFB8]/60 via-[#EFE0D0]/35 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="fixed -bottom-28 left-1/4 w-[680px] h-[680px] rounded-full bg-gradient-to-tr from-[#DFC3A3]/50 via-[#EADAC7]/35 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Floating Glass Sidebar Rail */}
      <Sidebar />

      {/* Main Content Area in Floating Frame */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Floating Glass Topbar Capsule */}
        <Topbar />

        {/* Scrollable Page Body with Translucent Glass Panels */}
        <main className="flex-1 overflow-y-auto mt-4 pr-1 sm:pr-2 space-y-6">
          <div className="max-w-7xl mx-auto pb-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
