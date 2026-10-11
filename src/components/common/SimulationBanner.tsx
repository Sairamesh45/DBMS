import React from 'react';

export const SimulationBanner: React.FC = () => {
  return (
    <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 text-xs text-center text-blue-900 font-medium">
      <span className="inline-block px-2 py-0.5 mr-2 rounded bg-blue-600 text-white font-mono text-[11px] font-bold">
        BCSE302P LAB PROJECT
      </span>
      Blockchain-Enabled Hardware Trust Gateway for Tamper-Proof Electronic Health Monitoring
    </div>
  );
};
