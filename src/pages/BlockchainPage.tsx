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
      <div className="p-8 sm:p-12 bubbly-glass text-center max-w-lg mx-auto my-12 space-y-4">
        <div className="w-16 h-16 rounded-full bg-[#FDF0EE] text-[#BF4E3B] border border-[#F5CAC3] flex items-center justify-center mx-auto shadow-xs">
          <Lock className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[#2A241E] font-serif">Access Restricted • Consortium Blockchain</h2>
          <p className="text-xs text-[#756A5C] mt-2 leading-relaxed">
            Consortium blockchain nodes, Merkle tree visualizers, and block anchoring tools are restricted to hospital auditors, clinical engineers, and administrators.
          </p>
        </div>
        <div className="pt-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="pill-btn-primary"
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
      <div className="bubbly-glass p-6 md:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#9C7854] to-[#85613D] text-white flex items-center justify-center shadow-xs">
            <Boxes className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-[#2A241E] font-serif">
              Consortium Blockchain Audit Ledger
            </h1>
            <p className="text-xs text-[#756A5C] mt-1">
              Periodically rolls up individual medical records into Merkle trees and anchors them to the hospital consortium chain.
            </p>
          </div>
        </div>

        {activeRole === 'Admin' ? (
          <button
            onClick={handleManualAnchor}
            disabled={isAnchoring}
            className="pill-btn-primary shrink-0 self-start sm:self-auto"
          >
            {isAnchoring ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Boxes className="w-4 h-4" />}
            <span>{isAnchoring ? 'Anchoring Block...' : 'Anchor Batch to Consortium'}</span>
          </button>
        ) : (
          <div className="px-4 py-2 rounded-full bg-white/70 border border-white/80 text-[#756A5C] text-xs font-semibold self-start sm:self-auto shadow-2xs">
            Rollup Anchoring: Admin Only
          </div>
        )}
      </div>

      {/* Network Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bubbly-card p-5 space-y-1">
          <span className="text-[#756A5C] block text-xs font-medium">Latest Block Height</span>
          <span className="text-2xl md:text-3xl font-bold font-serif text-[#9C7854] mt-1 block">
            #{events[0]?.blockHeight || 189422}
          </span>
          <span className="text-[11px] text-[#756A5C]">Consortium ledger sync</span>
        </div>
        <div className="bubbly-card p-5 space-y-1">
          <span className="text-[#756A5C] block text-xs font-medium">Consortium Consensus</span>
          <span className="text-2xl md:text-3xl font-bold font-serif text-[#2D6643] mt-1 block">
            5 / 5
          </span>
          <span className="text-[11px] text-[#2D6643] font-medium">Hospital Nodes Active</span>
        </div>
        <div className="bubbly-card p-5 space-y-1">
          <span className="text-[#756A5C] block text-xs font-medium">Batch Interval</span>
          <span className="text-2xl md:text-3xl font-bold font-serif text-[#2A241E] mt-1 block">
            5.0 Min
          </span>
          <span className="text-[11px] text-[#756A5C]">Scheduled rollup rate</span>
        </div>
        <div className="bubbly-card p-5 space-y-1">
          <span className="text-[#756A5C] block text-xs font-medium">Priority Anchoring</span>
          <span className="text-2xl md:text-3xl font-bold font-serif text-[#9C7854] mt-1 block">
            Instant
          </span>
          <span className="text-[11px] text-[#756A5C]">Bypasses batch on anomaly</span>
        </div>
      </div>

      {/* Visual Merkle Tree */}
      <MerkleTreeVisualizer />

      {/* Blocks History Table */}
      <div className="bubbly-glass p-6 md:p-7 space-y-4">
        <h3 className="text-base font-bold text-[#2A241E] font-serif">
          Anchored Blocks on Chain
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[rgba(160,140,115,0.12)] text-[#756A5C] font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-3 font-mono">Block #</th>
                <th className="py-3 px-3">Batch Type</th>
                <th className="py-3 px-3">Records</th>
                <th className="py-3 px-3 font-mono">Anchored Merkle Root</th>
                <th className="py-3 px-3">Consortium Nodes</th>
                <th className="py-3 px-3 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(160,140,115,0.08)] font-mono">
              {events.map(ev => (
                <tr key={ev.id} className="hover:bg-white/60 transition-colors">
                  <td className="py-3 px-3 font-bold text-[#9C7854]">#{ev.blockHeight}</td>
                  <td className="py-3 px-3 font-sans">
                    {ev.eventType === 'Emergency Priority Anchor' ? (
                      <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-[#FDF0EE] text-[#BF4E3B] border border-[#F5CAC3]">
                        EMERGENCY PRIORITY
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-[10px] font-semibold bg-[#F8F2EA] text-[#8C6642] border border-[#EADAC7]">
                        PERIODIC BATCH
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 font-semibold text-[#2A241E]">{ev.recordCount} items</td>
                  <td className="py-3 px-3 text-[#756A5C] max-w-[140px] truncate">{ev.merkleRoot}</td>
                  <td className="py-3 px-3 text-[#2D6643] font-sans">
                    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#EBF3ED] border border-[#C8E1D2]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 5/5 Confirmed
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right text-[#756A5C] font-sans">
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
