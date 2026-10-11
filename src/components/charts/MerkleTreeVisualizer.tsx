import React, { useState, useEffect } from 'react';
import { Layers, Copy, Check, ShieldCheck, Cpu } from 'lucide-react';
import { sha256 } from '../../services/cryptoService';

interface MerkleLeaf {
  id: string;
  label: string;
  patient: string;
  hash: string;
}

export const MerkleTreeVisualizer: React.FC = () => {
  const [selectedHash, setSelectedHash] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // 4 demonstration leaves
  const [leaves] = useState<MerkleLeaf[]>([
    {
      id: 'REC-01',
      label: 'Clinical Diagnostic Report (Eleanor Vance)',
      patient: 'PT-1042',
      hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    },
    {
      id: 'REC-02',
      label: 'Prescription & Medication Order (Eleanor Vance)',
      patient: 'PT-1042',
      hash: '7a8f33190b2c14de01e82a933f7ccb42699148d885a0c361952e805561fa2881',
    },
    {
      id: 'REC-03',
      label: 'Pathology & Lab Blood Analysis (Marcus Chen)',
      patient: 'PT-1088',
      hash: 'c4ca4238a0b923820dcc509a6f75849b29d479e0a29392e850b28490a07e9a8f',
    },
    {
      id: 'REC-04',
      label: 'Post-Operative Clinical Summary (Sophia Al-Mansoor)',
      patient: 'PT-1105',
      hash: '19b2e790a618d9f123bc4501a3489e2239fb041928374a56bca9204918e7d23a',
    },
  ]);

  const [h12, setH12] = useState<string>('Computing...');
  const [h34, setH34] = useState<string>('Computing...');
  const [root, setRoot] = useState<string>('Computing...');

  useEffect(() => {
    async function compute() {
      const branch1 = await sha256(leaves[0].hash + leaves[1].hash);
      const branch2 = await sha256(leaves[2].hash + leaves[3].hash);
      const merkleRoot = await sha256(branch1 + branch2);

      setH12(branch1);
      setH34(branch2);
      setRoot(merkleRoot);
      setSelectedHash(merkleRoot);
    }
    compute();
  }, [leaves]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">Cryptographic Merkle Tree Batch Rollup</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Hierarchical SHA-256 tree condensing individual medical records into a single verified root
          </p>
        </div>
        <div className="flex items-center gap-1.5 font-medium text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-lg">
          <ShieldCheck className="w-4 h-4" />
          <span>Consortium Verified (5 Nodes)</span>
        </div>
      </div>

      {/* Visual Tree Layout */}
      <div className="mt-6 flex flex-col items-center">
        {/* Layer 2: Merkle Root */}
        <div className="flex flex-col items-center">
          <div className="text-[10px] font-mono tracking-wider uppercase text-blue-600 font-bold mb-1">
            Layer 2 • Blockchain Anchored Merkle Root
          </div>
          <button
            onClick={() => setSelectedHash(root)}
            className={`group relative flex items-center gap-2 px-4 py-2 rounded-xl border font-mono text-xs transition-all cursor-pointer ${
              selectedHash === root
                ? 'bg-blue-50 border-blue-600 text-blue-900 shadow-xs scale-105'
                : 'bg-white border-slate-300 text-slate-700 hover:border-blue-400'
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-blue-600" />
            <span className="font-bold text-blue-700">ROOT:</span>
            <span className="tracking-wider">{root.slice(0, 16)}...{root.slice(-8)}</span>
          </button>
        </div>

        {/* Tree Branch Connectors */}
        <div className="w-96 h-8 flex justify-center items-center relative my-1">
          <div className="w-0.5 h-3 bg-blue-300" />
          <div className="absolute top-3 w-56 h-0.5 bg-blue-300" />
          <div className="absolute top-3 left-20 w-0.5 h-5 bg-blue-300" />
          <div className="absolute top-3 right-20 w-0.5 h-5 bg-blue-300" />
        </div>

        {/* Layer 1: Intermediate Hashes */}
        <div className="flex items-center justify-center gap-14 w-full">
          {/* Branch H12 */}
          <div className="flex flex-col items-center">
            <div className="text-[10px] font-mono uppercase text-slate-500 mb-1">
              Branch H₁₂ = SHA256(H₁ + H₂)
            </div>
            <button
              onClick={() => setSelectedHash(h12)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border font-mono text-xs transition-all cursor-pointer ${
                selectedHash === h12
                  ? 'bg-blue-50 border-blue-600 text-blue-900 scale-105 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400'
              }`}
            >
              <span className="text-blue-600 font-semibold">H₁₂:</span>
              <span>{h12.slice(0, 12)}...{h12.slice(-6)}</span>
            </button>
          </div>

          {/* Branch H34 */}
          <div className="flex flex-col items-center">
            <div className="text-[10px] font-mono uppercase text-slate-500 mb-1">
              Branch H₃₄ = SHA256(H₃ + H₄)
            </div>
            <button
              onClick={() => setSelectedHash(h34)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border font-mono text-xs transition-all cursor-pointer ${
                selectedHash === h34
                  ? 'bg-blue-50 border-blue-600 text-blue-900 scale-105 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400'
              }`}
            >
              <span className="text-blue-600 font-semibold">H₃₄:</span>
              <span>{h34.slice(0, 12)}...{h34.slice(-6)}</span>
            </button>
          </div>
        </div>

        {/* Tree Branch Connectors to Leaves */}
        <div className="w-full max-w-2xl h-8 flex justify-between px-16 relative my-1">
          <div className="flex justify-center w-48 relative">
            <div className="w-0.5 h-2 bg-slate-300" />
            <div className="absolute top-2 w-32 h-0.5 bg-slate-300" />
            <div className="absolute top-2 left-8 w-0.5 h-6 bg-slate-300" />
            <div className="absolute top-2 right-8 w-0.5 h-6 bg-slate-300" />
          </div>
          <div className="flex justify-center w-48 relative">
            <div className="w-0.5 h-2 bg-slate-300" />
            <div className="absolute top-2 w-32 h-0.5 bg-slate-300" />
            <div className="absolute top-2 left-8 w-0.5 h-6 bg-slate-300" />
            <div className="absolute top-2 right-8 w-0.5 h-6 bg-slate-300" />
          </div>
        </div>

        {/* Layer 0: Leaves */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full">
          {leaves.map((leaf, idx) => (
            <div
              key={leaf.id}
              onClick={() => setSelectedHash(leaf.hash)}
              className={`cursor-pointer p-3 rounded-lg border transition-all text-left ${
                selectedHash === leaf.hash
                  ? 'bg-blue-50 border-blue-500 shadow-xs'
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-mono text-blue-600 mb-1 font-semibold">
                <span>LEAF H{idx + 1}</span>
                <span className="text-slate-500 font-sans">{leaf.patient}</span>
              </div>
              <div className="text-xs font-semibold text-slate-800 line-clamp-1">{leaf.label}</div>
              <div className="font-mono text-[10px] text-slate-600 mt-2 truncate bg-white px-2 py-1 rounded border border-slate-200">
                {leaf.hash}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Node Inspector */}
      {selectedHash && (
        <div className="mt-5 p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Cpu className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="text-slate-500 shrink-0 font-sans font-medium">Selected Hash:</span>
            <span className="text-slate-900 font-semibold truncate break-all">{selectedHash}</span>
          </div>
          <button
            onClick={() => handleCopy(selectedHash)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-sans font-medium transition-colors shrink-0 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Hash'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
