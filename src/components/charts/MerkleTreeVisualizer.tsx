import React, { useState, useEffect } from 'react';
import { Layers, Copy, Check, ShieldCheck } from 'lucide-react';
import { dataService } from '../../services/dataService';

interface MerkleLeaf {
  id: string;
  label: string;
  hash: string;
}

export const MerkleTreeVisualizer: React.FC = () => {
  const [selectedHash, setSelectedHash] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [leaves, setLeaves] = useState<MerkleLeaf[]>([
    { id: 'PRV-90410', label: '12-Lead ECG Telemetry (Eleanor Vance)', hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' },
    { id: 'PRV-90409', label: 'SpO2 Pulse Oximetry (Eleanor Vance)', hash: '7a8f33190b2c14de01e82a933f7ccb42699148d885a0c361952e805561fa2881' },
    { id: 'PRV-90406', label: '12-Lead ECG Telemetry (David O\'Connor)', hash: '19b2e790a618d9f123bc4501a3489e2239fb041928374a56bca9204918e7d23a' },
    { id: 'PRV-90401', label: 'NIBP Blood Pressure (Marcus Chen)', hash: '3c19e8401f820b927a4810e927c8192a01f829371029c8192a0192837192a019' },
  ]);
  const [h12, setH12] = useState<string>('a47f29b01c38e92a481c70e9a4f201d8b941c28e109283719283019283719283');
  const [h34, setH34] = useState<string>('c8201fa3829e1c08d927a419c820b17e481c201d928371029384719283719283');
  const [root, setRoot] = useState<string>('9fa17c802b192841d08e7c2918e7410c829e018a381920192837192837192837');

  useEffect(() => {
    dataService.getMerkleTree().then(res => {
      setLeaves(res.leaves);
      if (res.tree.layers.length >= 2) {
        const intermediate = res.tree.layers[1];
        setH12(intermediate[0] || 'N/A');
        setH34(intermediate[1] || intermediate[0] || 'N/A');
      }
      setRoot(res.tree.root);
      setSelectedHash(res.tree.root);
    }).catch(err => {
      console.warn('Merkle tree fetch fallback:', err);
    });
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-[#e6dfd5] bg-white p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#e6dfd5]">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#8c6d46]" />
            <h3 className="text-base font-bold text-[#2c2623]">Cryptographic Merkle Tree Batch Rollup</h3>
          </div>
          <p className="text-xs text-[#78716c] mt-0.5">
            Hierarchical SHA-256 tree condensing individual medical records into a single verified root anchored on chain
          </p>
        </div>
        <div className="flex items-center gap-1.5 font-medium text-xs bg-[#f2f7f3] border border-[#c6dcce] text-[#2d6e42] px-3 py-1.5 rounded-xl">
          <ShieldCheck className="w-4 h-4" />
          <span>Consortium Verified (5 Nodes)</span>
        </div>
      </div>

      {/* Visual Tree Layout */}
      <div className="mt-6 flex flex-col items-center">
        {/* Layer 2: Merkle Root */}
        <div className="flex flex-col items-center">
          <div className="text-[10px] font-mono tracking-wider uppercase text-[#8c6d46] font-bold mb-1">
            Layer 2 • Blockchain Anchored Merkle Root
          </div>
          <button
            onClick={() => setSelectedHash(root)}
            className={`group relative flex items-center gap-2 px-4 py-2 rounded-xl border font-mono text-xs transition-all cursor-pointer ${
              selectedHash === root
                ? 'bg-[#f5efeb] border-[#8c6d46] text-[#2c2623] shadow-xs scale-105'
                : 'bg-white border-[#d8cfc2] text-[#78716c] hover:border-[#8c6d46]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#8c6d46]" />
            <span className="font-bold">H_ROOT:</span>
            <span className="truncate max-w-[180px] sm:max-w-[280px]">{root}</span>
          </button>
          <div className="w-px h-6 bg-[#d8cfc2]" />
        </div>

        {/* Layer 1: Intermediate Branches */}
        <div className="w-full max-w-xl">
          <div className="relative flex justify-around">
            <div className="absolute top-0 left-1/4 right-1/4 h-px bg-[#d8cfc2]" />

            {/* Left Branch */}
            <div className="flex flex-col items-center pt-3">
              <div className="text-[9px] font-mono text-[#78716c] mb-1">H_12 Branch</div>
              <button
                onClick={() => setSelectedHash(h12)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-mono text-[11px] transition-all cursor-pointer ${
                  selectedHash === h12
                    ? 'bg-[#f5efeb] border-[#8c6d46] text-[#2c2623]'
                    : 'bg-white border-[#e6dfd5] text-[#78716c] hover:border-[#8c6d46]'
                }`}
              >
                <span className="truncate max-w-[120px] sm:max-w-[160px]">{h12}</span>
              </button>
              <div className="w-px h-6 bg-[#d8cfc2]" />
            </div>

            {/* Right Branch */}
            <div className="flex flex-col items-center pt-3">
              <div className="text-[9px] font-mono text-[#78716c] mb-1">H_34 Branch</div>
              <button
                onClick={() => setSelectedHash(h34)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-mono text-[11px] transition-all cursor-pointer ${
                  selectedHash === h34
                    ? 'bg-[#f5efeb] border-[#8c6d46] text-[#2c2623]'
                    : 'bg-white border-[#e6dfd5] text-[#78716c] hover:border-[#8c6d46]'
                }`}
              >
                <span className="truncate max-w-[120px] sm:max-w-[160px]">{h34}</span>
              </button>
              <div className="w-px h-6 bg-[#d8cfc2]" />
            </div>
          </div>
        </div>

        {/* Layer 0: Leaf Hashes */}
        <div className="w-full mt-1">
          <div className="text-[10px] font-mono tracking-wider uppercase text-[#78716c] font-semibold text-center mb-2">
            Layer 0 • Verified Medical Telemetry Leaves
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
            {leaves.slice(0, 4).map((leaf, idx) => (
              <div
                key={leaf.id || idx}
                onClick={() => setSelectedHash(leaf.hash)}
                className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                  selectedHash === leaf.hash
                    ? 'bg-[#f5efeb] border-[#8c6d46] shadow-xs'
                    : 'bg-[#faf7f2] border-[#e6dfd5] hover:border-[#8c6d46]'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-mono text-[#78716c] mb-1">
                  <span className="font-bold text-[#8c6d46]">H_{idx + 1}</span>
                  <span>{leaf.id}</span>
                </div>
                <div className="font-semibold text-[#2c2623] truncate text-[11px]">
                  {leaf.label}
                </div>
                <div className="mt-1 font-mono text-[10px] text-[#78716c] truncate">
                  {leaf.hash}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Hash Inspector */}
      {selectedHash && (
        <div className="mt-5 p-3.5 rounded-xl bg-[#faf7f2] border border-[#e6dfd5] text-xs">
          <div className="flex items-center justify-between text-[#78716c] text-[11px] mb-1">
            <span className="font-medium">Selected Node Digest:</span>
            <button
              onClick={() => handleCopy(selectedHash)}
              className="text-[#8c6d46] hover:text-[#745733] flex items-center gap-1 cursor-pointer font-sans"
            >
              {copied ? <Check className="w-3 h-3 text-[#2d6e42]" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy Full Hash'}</span>
            </button>
          </div>
          <div className="font-mono text-[#2c2623] break-all select-all font-semibold">
            {selectedHash}
          </div>
        </div>
      )}
    </div>
  );
};
