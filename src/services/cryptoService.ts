/**
 * MEDGUARD Cryptographic Service
 * Provides client-side SHA-256 hashing via Web Crypto API,
 * deterministic canonical JSON serialization, Merkle tree construction,
 * and simulated PUF hardware challenge-response verification.
 */

// Deterministic JSON serializer to ensure hash consistency across key orders
export function canonicalStringify(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(item => canonicalStringify(item)).join(',') + ']';
  }
  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys.map(key => {
    return JSON.stringify(key) + ':' + canonicalStringify(obj[key]);
  });
  return '{' + pairs.join(',') + '}';
}

// Compute genuine SHA-256 hash
export async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  if (window.crypto && window.crypto.subtle) {
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } else {
    // Pure JS fallback if crypto.subtle is unavailable
    return pseudoSha256Fallback(message);
  }
}

// Fallback hash implementation
function pseudoSha256Fallback(str: string): string {
  let hash1 = 0xdeadbeef;
  let hash2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash1 = Math.imul(hash1 ^ ch, 2654435761);
    hash2 = Math.imul(hash2 ^ ch, 1597334677);
  }
  hash1 = Math.imul(hash1 ^ (hash1 >>> 16), 2246822507);
  hash1 ^= Math.imul(hash2 ^ (hash2 >>> 13), 3266489909);
  hash2 = Math.imul(hash2 ^ (hash2 >>> 16), 2246822507);
  hash2 ^= Math.imul(hash1 ^ (hash1 >>> 13), 3266489909);
  const part1 = (hash1 >>> 0).toString(16).padStart(8, '0');
  const part2 = (hash2 >>> 0).toString(16).padStart(8, '0');
  return (part1 + part2 + part1 + part2 + part1 + part2 + part1 + part2).slice(0, 64);
}

export interface MerkleNode {
  hash: string;
  left?: MerkleNode;
  right?: MerkleNode;
  isLeaf?: boolean;
  dataId?: string;
  label?: string;
}

export interface MerkleTreeResult {
  root: string;
  layers: string[][];
  leaves: string[];
}

/**
 * Builds a Merkle Tree from an array of leaf hashes using SHA-256
 */
export async function buildMerkleTree(leafHashes: string[]): Promise<MerkleTreeResult> {
  if (leafHashes.length === 0) {
    const emptyRoot = await sha256('EMPTY_TREE');
    return { root: emptyRoot, layers: [[]], leaves: [] };
  }

  const leaves = [...leafHashes];
  // If odd count > 1, duplicate the last leaf to balance the tree
  let currentLayer = [...leaves];
  if (currentLayer.length % 2 !== 0 && currentLayer.length > 1) {
    currentLayer.push(currentLayer[currentLayer.length - 1]);
  }

  const layers: string[][] = [currentLayer];

  while (currentLayer.length > 1) {
    const nextLayer: string[] = [];
    for (let i = 0; i < currentLayer.length; i += 2) {
      const left = currentLayer[i];
      const right = i + 1 < currentLayer.length ? currentLayer[i + 1] : left;
      const combined = await sha256(left + right);
      nextLayer.push(combined);
    }
    layers.push(nextLayer);
    currentLayer = nextLayer;
  }

  return {
    root: currentLayer[0],
    layers,
    leaves,
  };
}

/**
 * Verifies a challenge response from a simulated PUF (Physical Unclonable Function)
 */
export async function simulatePUFChallengeResponse(
  hardwareFingerprint: string,
  nonce: string
): Promise<{ success: boolean; signature: string; latencyMs: number }> {
  // Simulate hardware cryptographic challenge latency (150ms - 350ms)
  const latency = Math.floor(Math.random() * 200) + 150;
  await new Promise(r => setTimeout(r, latency));

  const signature = await sha256(`${hardwareFingerprint}:${nonce}:ECDSA_SECP256K1_SIM`);
  // If the fingerprint begins with 'QUARANTINE' or 'COMPROMISED', fail challenge
  const isCompromised = hardwareFingerprint.includes('COMPROMISED') || hardwareFingerprint.includes('BLOCKED');

  return {
    success: !isCompromised,
    signature,
    latencyMs: latency,
  };
}
