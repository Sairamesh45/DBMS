import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Sparkles,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { BlockchainAnchoringEvent } from '../types';
import { MerkleTreeVisualizer } from '../components/charts/MerkleTreeVisualizer';
import { useGateway } from '../context/GatewayContext';
import { useToast } from '../context/ToastContext';

export const BlockchainPage: React.FC = () => {
  const { showToast } = useToast();
  const { refreshTrigger, triggerRefresh } = useGateway();

  const [events, setEvents] = useState<BlockchainAnchoringEvent[]>([]);
  const [isAnchoring, setIsAnchoring] = useState(false);

  useEffect(() => {
    dataService.getBlockchainEvents().then(setEvents);
  }, [refreshTrigger]);

  const handleManualAnchor = async () => {
    setIsAnchoring(true);
    try {
      const newBlock = await dataService.anchorPendingBatch();
      triggerRefresh();
      showToast({
        type: 'success',
        title: 'Block Anchored to Blockchain',
        message: `Block #${newBlock.blockHeight} mined (${newBlock.recordCount} records). Confirmed by 5/5 consortium nodes!`,
      });
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsAnchoring(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Boxes className="w-5 h-5 text-blue-600" />
            Consortium Blockchain Audit Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Periodically rolls up individual medical records into Merkle trees and anchors them to the hospital consortium chain
          </p>
        </div>

        <button
          onClick={handleManualAnchor}
          disabled={isAnchoring}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
        >
          {isAnchoring ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          <span>{isAnchoring ? 'Mining Block...' : 'Anchor Batch (Mine Next Block)'}</span>
        </button>
      </div>

      {/* Network Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <span className="text-slate-500 block text-xs font-medium">Latest Block Height:</span>
          <span className="text-xl font-bold font-mono text-blue-600 mt-1 block">
            #{events[0]?.blockHeight || 189422}
          </span>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <span className="text-slate-500 block text-xs font-medium">Consortium Consensus:</span>
          <span className="text-lg font-bold font-mono text-emerald-600 mt-1 block">
            5 / 5 Hospital Nodes
          </span>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <span className="text-slate-500 block text-xs font-medium">Batch Interval:</span>
          <span className="text-lg font-bold font-mono text-slate-900 mt-1 block">5.0 Minutes</span>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <span className="text-slate-500 block text-xs font-medium">Priority Anchoring:</span>
          <span className="text-lg font-bold font-mono text-purple-600 mt-1 block">Instant on Anomaly</span>
        </div>
      </div>

      {/* Visual Merkle Tree */}
      <MerkleTreeVisualizer />

      {/* Blocks History Table */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900">
          Anchored Blocks on Chain
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3 font-mono">Block #</th>
                <th className="py-2.5 px-3">Batch Type</th>
                <th className="py-2.5 px-3">Records</th>
                <th className="py-2.5 px-3 font-mono">Anchored Merkle Root</th>
                <th className="py-2.5 px-3">Consortium Nodes</th>
                <th className="py-2.5 px-3 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {events.map(ev => (
                <tr key={ev.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-3 font-bold text-blue-600">#{ev.blockHeight}</td>
                  <td className="py-2.5 px-3 font-sans">
                    {ev.eventType === 'Emergency Priority Anchor' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        EMERGENCY PRIORITY
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        PERIODIC BATCH
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">{ev.recordCount} items</td>
                  <td className="py-2.5 px-3 text-slate-600 max-w-[140px] truncate">{ev.merkleRoot}</td>
                  <td className="py-2.5 px-3 text-emerald-600 font-sans">
                    <span className="inline-flex items-center gap-1 font-mono text-[11px] font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 5/5 Confirmed
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-500 font-sans">
                    {new Date(ev.timestamp).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
