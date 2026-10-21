import React, { useState, useEffect } from 'react';
import {
  Boxes,
  RefreshCw,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { dataService } from '../services/dataService';
import { BlockchainAnchoringEvent } from '../types';
import { MerkleTreeVisualizer } from '../components/charts/MerkleTreeVisualizer';
import { useGateway } from '../context/GatewayContext';
import { useToast } from '../context/ToastContext';

export const BlockchainPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { activeRole, refreshTrigger, triggerRefresh } = useGateway();

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
      showToast({
        type: 'error',
        title: 'Anchoring Error',
        message: e.message || 'Could not anchor batch to consortium',
      });
    } finally {
      setIsAnchoring(false);
    }
  };

  // RBAC Access Guard: Patient cannot inspect consortium chain infrastructure
  if (activeRole === 'Patient') {
    return (
      <div className="p-8 sm:p-12 rounded-2xl bg-white border border-[#e6dfd5] text-center max-w-lg mx-auto my-12 space-y-4 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-[#fdf3f3] text-[#9e2a2b] border border-[#f5cacc] flex items-center justify-center mx-auto shadow-2xs">
          <Lock className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-base font-bold text-[#2c2623]">Access Restricted • Consortium Blockchain</h2>
          <p className="text-xs text-[#78716c] mt-2 leading-relaxed">
            Consortium blockchain nodes, Merkle tree visualizers, and block anchoring tools are restricted to hospital auditors, clinical engineers, and administrators.
          </p>
        </div>
        <div className="pt-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 rounded-xl bg-[#8c6d46] hover:bg-[#745733] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Return to My Health Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="p-5 rounded-2xl bg-white border border-[#e6dfd5] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-[#2c2623] flex items-center gap-2">
            <Boxes className="w-5 h-5 text-[#8c6d46]" />
            Consortium Blockchain Audit Ledger
          </h1>
          <p className="text-xs text-[#78716c] mt-1">
            Periodically rolls up individual medical records into Merkle trees and anchors them to the hospital consortium chain
          </p>
        </div>

        {activeRole === 'Admin' ? (
          <button
            onClick={handleManualAnchor}
            disabled={isAnchoring}
            className="px-4 py-2 rounded-xl bg-[#8c6d46] hover:bg-[#745733] text-white font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 shrink-0 self-start sm:self-auto"
          >
            {isAnchoring ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Boxes className="w-4 h-4" />}
            <span>{isAnchoring ? 'Anchoring Block...' : 'Anchor Batch to Consortium'}</span>
          </button>
        ) : (
          <div className="px-3 py-1.5 rounded-lg bg-[#f7f4ee] border border-[#e6dfd5] text-[#78716c] text-xs font-medium self-start sm:self-auto">
            Rollup Anchoring: Admin Only
          </div>
        )}
      </div>

      {/* Network Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-[#e6dfd5] shadow-xs">
          <span className="text-[#78716c] block text-xs font-medium">Latest Block Height:</span>
          <span className="text-xl font-bold font-mono text-[#8c6d46] mt-1 block">
            #{events[0]?.blockHeight || 189422}
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-[#e6dfd5] shadow-xs">
          <span className="text-[#78716c] block text-xs font-medium">Consortium Consensus:</span>
          <span className="text-lg font-bold font-mono text-[#2d6e42] mt-1 block">
            5 / 5 Hospital Nodes
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-[#e6dfd5] shadow-xs">
          <span className="text-[#78716c] block text-xs font-medium">Batch Interval:</span>
          <span className="text-lg font-bold font-mono text-[#2c2623] mt-1 block">5.0 Minutes</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-[#e6dfd5] shadow-xs">
          <span className="text-[#78716c] block text-xs font-medium">Priority Anchoring:</span>
          <span className="text-lg font-bold font-mono text-[#8c6d46] mt-1 block">Instant on Anomaly</span>
        </div>
      </div>

      {/* Visual Merkle Tree */}
      <MerkleTreeVisualizer />

      {/* Blocks History Table */}
      <div className="p-5 rounded-2xl bg-white border border-[#e6dfd5] shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-[#2c2623]">
          Anchored Blocks on Chain
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#e6dfd5] bg-[#faf7f2] text-[#78716c] font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3 font-mono">Block #</th>
                <th className="py-2.5 px-3">Batch Type</th>
                <th className="py-2.5 px-3">Records</th>
                <th className="py-2.5 px-3 font-mono">Anchored Merkle Root</th>
                <th className="py-2.5 px-3">Consortium Nodes</th>
                <th className="py-2.5 px-3 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5efeb] font-mono">
              {events.map(ev => (
                <tr key={ev.id} className="hover:bg-[#faf7f2] transition-colors">
                  <td className="py-2.5 px-3 font-bold text-[#8c6d46]">#{ev.blockHeight}</td>
                  <td className="py-2.5 px-3 font-sans">
                    {ev.eventType === 'Emergency Priority Anchor' ? (
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-[#fdf3f3] text-[#9e2a2b] border border-[#f5cacc]">
                        EMERGENCY PRIORITY
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-[#f5efeb] text-[#8c6d46] border border-[#d8cfc2]">
                        PERIODIC BATCH
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-[#2c2623]">{ev.recordCount} items</td>
                  <td className="py-2.5 px-3 text-[#78716c] max-w-[140px] truncate">{ev.merkleRoot}</td>
                  <td className="py-2.5 px-3 text-[#2d6e42] font-sans">
                    <span className="inline-flex items-center gap-1 font-mono text-[11px] font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 5/5 Confirmed
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right text-[#78716c] font-sans">
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
