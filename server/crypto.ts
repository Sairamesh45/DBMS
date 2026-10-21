import { createHash } from 'node:crypto';

/**
 * Deterministic JSON serializer to ensure consistent SHA-256 digests across property key orders
 */
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

/**
 * Compute genuine SHA-256 digest
 */
export function sha256(message: string): string {
  return createHash('sha256').update(message, 'utf8').digest('hex');
}

export interface MerkleTreeResult {
  root: string;
  layers: string[][];
  leaves: string[];
}

/**
 * Builds a Merkle Tree from an array of leaf hashes using SHA-256
 */
export function buildMerkleTree(leafHashes: string[]): MerkleTreeResult {
  if (leafHashes.length === 0) {
    const emptyRoot = sha256('EMPTY_TREE');
    return { root: emptyRoot, layers: [[]], leaves: [] };
  }

  const leaves = [...leafHashes];
  let currentLayer = [...leaves];
  // Balance tree if odd count > 1
  if (currentLayer.length % 2 !== 0 && currentLayer.length > 1) {
    currentLayer.push(currentLayer[currentLayer.length - 1]);
  }

  const layers: string[][] = [currentLayer];

  while (currentLayer.length > 1) {
    const nextLayer: string[] = [];
    for (let i = 0; i < currentLayer.length; i += 2) {
      const left = currentLayer[i];
      const right = i + 1 < currentLayer.length ? currentLayer[i + 1] : left;
      const combined = sha256(left + right);
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
 * Simulates PUF hardware challenge-response token authentication
 */
export async function simulatePUFChallengeResponse(
  hardwareFingerprint: string,
  nonce: string
): Promise<{ success: boolean; signature: string; latencyMs: number }> {
  // Simulate hardware challenge latency (50ms - 150ms)
  const latency = Math.floor(Math.random() * 100) + 50;
  await new Promise(r => setTimeout(r, latency));

  const signature = sha256(`${hardwareFingerprint}:${nonce}:ECDSA_SECP256K1_SIM`);
  const isCompromised = hardwareFingerprint.includes('COMPROMISED') || hardwareFingerprint.includes('BLOCKED');

  return {
    success: !isCompromised,
    signature,
    latencyMs: latency,
  };
}
