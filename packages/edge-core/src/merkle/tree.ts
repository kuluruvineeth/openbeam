import { createBLAKE3, type IHasher } from "hash-wasm";

let hasherInstance: IHasher | null = null;

async function getHasher(): Promise<IHasher> {
  if (!hasherInstance) {
    hasherInstance = await createBLAKE3();
  }
  return hasherInstance;
}

async function blake3(data: string): Promise<string> {
  const h = await getHasher();
  h.init();
  h.update(data);
  return h.digest("hex");
}

interface ProofNode {
  hash: string;
  direction: "left" | "right";
}

interface SerializedTree {
  entries: [string, string][];
  root: string;
}

export class MerkleTree {
  private readonly entries = new Map<string, string>();
  private cachedRoot: string | null = null;

  get size(): number {
    return this.entries.size;
  }

  insert(key: string, value: string): void {
    this.entries.set(key, value);
    this.cachedRoot = null;
  }

  remove(key: string): boolean {
    const existed = this.entries.delete(key);
    if (existed) {
      this.cachedRoot = null;
    }
    return existed;
  }

  has(key: string): boolean {
    return this.entries.has(key);
  }

  async getRoot(): Promise<string> {
    if (this.cachedRoot) {
      return this.cachedRoot;
    }

    if (this.entries.size === 0) {
      this.cachedRoot = await blake3("");
      return this.cachedRoot;
    }

    const leafHashes = await this.buildLeafHashes();
    this.cachedRoot = await buildMerkleRoot(leafHashes);
    return this.cachedRoot;
  }

  diff(other: MerkleTree): string[] {
    const allKeys = new Set([...this.entries.keys(), ...other.entries.keys()]);
    const diffKeys: string[] = [];

    for (const key of allKeys) {
      const localVal = this.entries.get(key);
      const remoteVal = other.entries.get(key);
      if (localVal !== remoteVal) {
        diffKeys.push(key);
      }
    }

    return diffKeys.sort();
  }

  async getProof(key: string): Promise<ProofNode[]> {
    if (!this.entries.has(key)) {
      return [];
    }

    const sortedKeys = [...this.entries.keys()].sort();
    const leafHashes = await this.buildLeafHashes();
    const targetIndex = sortedKeys.indexOf(key);
    return buildProof(leafHashes, targetIndex);
  }

  static async verify(
    key: string,
    value: string,
    proof: ProofNode[],
    root: string
  ): Promise<boolean> {
    let hash = await blake3(`${key}:${value}`);

    for (const node of proof) {
      if (node.direction === "left") {
        hash = await blake3(node.hash + hash);
      } else {
        hash = await blake3(hash + node.hash);
      }
    }

    return hash === root;
  }

  async serialize(): Promise<SerializedTree> {
    const entries = [...this.entries.entries()].sort((a, b) =>
      a[0].localeCompare(b[0])
    );
    const root = await this.getRoot();
    return { entries, root };
  }

  static deserialize(data: SerializedTree): MerkleTree {
    const tree = new MerkleTree();
    for (const [key, value] of data.entries) {
      tree.entries.set(key, value);
    }
    return tree;
  }

  private async buildLeafHashes(): Promise<string[]> {
    const sortedKeys = [...this.entries.keys()].sort();
    const hashes: string[] = [];
    for (const key of sortedKeys) {
      const value = this.entries.get(key) ?? "";
      hashes.push(await blake3(`${key}:${value}`));
    }
    return hashes;
  }
}

async function buildMerkleRoot(hashes: string[]): Promise<string> {
  if (hashes.length === 0) {
    return blake3("");
  }
  if (hashes.length === 1) {
    return hashes[0];
  }

  const nextLevel: string[] = [];
  for (let i = 0; i < hashes.length; i += 2) {
    if (i + 1 < hashes.length) {
      nextLevel.push(await blake3(hashes[i] + hashes[i + 1]));
    } else {
      nextLevel.push(hashes[i]);
    }
  }

  return buildMerkleRoot(nextLevel);
}

async function buildProof(
  hashes: string[],
  targetIndex: number
): Promise<ProofNode[]> {
  if (hashes.length <= 1) {
    return [];
  }

  const proof: ProofNode[] = [];
  let currentIndex = targetIndex;
  let currentLevel = hashes;

  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      if (i + 1 < currentLevel.length) {
        nextLevel.push(await blake3(currentLevel[i] + currentLevel[i + 1]));
      } else {
        nextLevel.push(currentLevel[i]);
      }
    }

    const pairIndex =
      currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1;

    if (pairIndex < currentLevel.length) {
      proof.push({
        hash: currentLevel[pairIndex],
        direction: currentIndex % 2 === 0 ? "right" : "left",
      });
    }

    currentIndex = Math.floor(currentIndex / 2);
    currentLevel = nextLevel;
  }

  return proof;
}
