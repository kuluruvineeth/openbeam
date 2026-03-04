import { describe, expect, test } from "bun:test";
import { MerkleTree } from "../tree";

const BLAKE3_HEX_PATTERN = /^[0-9a-f]{64}$/;

describe("MerkleTree", () => {
  test("empty tree has zero size", () => {
    const tree = new MerkleTree();
    expect(tree.size).toBe(0);
  });

  test("insert increases size", () => {
    const tree = new MerkleTree();
    tree.insert("a", "1");
    expect(tree.size).toBe(1);
    tree.insert("b", "2");
    expect(tree.size).toBe(2);
  });

  test("insert overwrites same key", () => {
    const tree = new MerkleTree();
    tree.insert("a", "1");
    tree.insert("a", "2");
    expect(tree.size).toBe(1);
  });

  test("remove decreases size", () => {
    const tree = new MerkleTree();
    tree.insert("a", "1");
    expect(tree.remove("a")).toBe(true);
    expect(tree.size).toBe(0);
  });

  test("remove returns false for missing key", () => {
    const tree = new MerkleTree();
    expect(tree.remove("missing")).toBe(false);
  });

  test("has returns true for existing key", () => {
    const tree = new MerkleTree();
    tree.insert("a", "1");
    expect(tree.has("a")).toBe(true);
  });

  test("has returns false for missing key", () => {
    const tree = new MerkleTree();
    expect(tree.has("a")).toBe(false);
  });

  test("getRoot returns consistent hash for same data", async () => {
    const t1 = new MerkleTree();
    t1.insert("a", "1");
    t1.insert("b", "2");

    const t2 = new MerkleTree();
    t2.insert("b", "2");
    t2.insert("a", "1");

    expect(await t1.getRoot()).toBe(await t2.getRoot());
  });

  test("getRoot changes when data changes", async () => {
    const tree = new MerkleTree();
    tree.insert("a", "1");
    const root1 = await tree.getRoot();

    tree.insert("a", "2");
    const root2 = await tree.getRoot();

    expect(root1).not.toBe(root2);
  });

  test("getRoot returns hash for empty tree", async () => {
    const tree = new MerkleTree();
    const root = await tree.getRoot();
    expect(root).toBeTruthy();
    expect(typeof root).toBe("string");
  });

  test("getRoot caches result", async () => {
    const tree = new MerkleTree();
    tree.insert("a", "1");
    const root1 = await tree.getRoot();
    const root2 = await tree.getRoot();
    expect(root1).toBe(root2);
  });

  test("insert invalidates root cache", async () => {
    const tree = new MerkleTree();
    tree.insert("a", "1");
    await tree.getRoot();
    tree.insert("b", "2");
    const newRoot = await tree.getRoot();
    expect(typeof newRoot).toBe("string");
  });

  test("different data produces different roots", async () => {
    const t1 = new MerkleTree();
    t1.insert("a", "1");

    const t2 = new MerkleTree();
    t2.insert("a", "2");

    expect(await t1.getRoot()).not.toBe(await t2.getRoot());
  });

  test("diff returns empty array for identical trees", () => {
    const t1 = new MerkleTree();
    t1.insert("a", "1");
    t1.insert("b", "2");

    const t2 = new MerkleTree();
    t2.insert("a", "1");
    t2.insert("b", "2");

    expect(t1.diff(t2)).toEqual([]);
  });

  test("diff returns modified keys", () => {
    const t1 = new MerkleTree();
    t1.insert("a", "1");
    t1.insert("b", "2");

    const t2 = new MerkleTree();
    t2.insert("a", "1");
    t2.insert("b", "3");

    expect(t1.diff(t2)).toEqual(["b"]);
  });

  test("diff returns keys only in one tree", () => {
    const t1 = new MerkleTree();
    t1.insert("a", "1");

    const t2 = new MerkleTree();
    t2.insert("b", "2");

    const result = t1.diff(t2);
    expect(result).toEqual(["a", "b"]);
  });

  test("diff with empty tree returns all keys", () => {
    const t1 = new MerkleTree();
    t1.insert("a", "1");
    t1.insert("b", "2");

    const t2 = new MerkleTree();

    expect(t1.diff(t2)).toEqual(["a", "b"]);
  });

  test("diff is symmetric", () => {
    const t1 = new MerkleTree();
    t1.insert("a", "1");
    t1.insert("c", "3");

    const t2 = new MerkleTree();
    t2.insert("a", "1");
    t2.insert("b", "2");

    expect(t1.diff(t2)).toEqual(t2.diff(t1));
  });

  test("getProof returns empty for missing key", async () => {
    const tree = new MerkleTree();
    tree.insert("a", "1");
    expect(await tree.getProof("missing")).toEqual([]);
  });

  test("getProof returns proof nodes", async () => {
    const tree = new MerkleTree();
    tree.insert("a", "1");
    tree.insert("b", "2");
    const proof = await tree.getProof("a");
    expect(proof.length).toBeGreaterThan(0);
    expect(proof[0]).toHaveProperty("hash");
    expect(proof[0]).toHaveProperty("direction");
  });

  test("verify confirms valid proof", async () => {
    const tree = new MerkleTree();
    tree.insert("a", "1");
    tree.insert("b", "2");
    tree.insert("c", "3");

    const root = await tree.getRoot();
    const proof = await tree.getProof("b");
    expect(await MerkleTree.verify("b", "2", proof, root)).toBe(true);
  });

  test("verify rejects tampered value", async () => {
    const tree = new MerkleTree();
    tree.insert("a", "1");
    tree.insert("b", "2");

    const root = await tree.getRoot();
    const proof = await tree.getProof("a");
    expect(await MerkleTree.verify("a", "tampered", proof, root)).toBe(false);
  });

  test("verify rejects wrong root", async () => {
    const tree = new MerkleTree();
    tree.insert("a", "1");
    tree.insert("b", "2");

    const proof = await tree.getProof("a");
    expect(await MerkleTree.verify("a", "1", proof, "badhash")).toBe(false);
  });

  test("serialize and deserialize round-trip", async () => {
    const original = new MerkleTree();
    original.insert("x", "10");
    original.insert("y", "20");
    original.insert("z", "30");

    const serialized = await original.serialize();
    const restored = MerkleTree.deserialize(serialized);

    expect(restored.size).toBe(3);
    expect(restored.has("x")).toBe(true);
    expect(restored.has("y")).toBe(true);
    expect(restored.has("z")).toBe(true);
    expect(await restored.getRoot()).toBe(await original.getRoot());
  });

  test("serialized entries are sorted", async () => {
    const tree = new MerkleTree();
    tree.insert("c", "3");
    tree.insert("a", "1");
    tree.insert("b", "2");

    const serialized = await tree.serialize();
    expect(serialized.entries.map(([k]) => k)).toEqual(["a", "b", "c"]);
  });

  test("single entry tree has valid proof", async () => {
    const tree = new MerkleTree();
    tree.insert("only", "one");

    const root = await tree.getRoot();
    const proof = await tree.getProof("only");
    expect(await MerkleTree.verify("only", "one", proof, root)).toBe(true);
  });

  test("large tree proof verification", async () => {
    const tree = new MerkleTree();
    for (let i = 0; i < 100; i += 1) {
      tree.insert(`key-${i}`, `value-${i}`);
    }

    const root = await tree.getRoot();
    const proof = await tree.getProof("key-50");
    expect(await MerkleTree.verify("key-50", "value-50", proof, root)).toBe(
      true
    );
  });

  test("odd number of leaves produces valid root", async () => {
    const tree = new MerkleTree();
    tree.insert("a", "1");
    tree.insert("b", "2");
    tree.insert("c", "3");

    const root = await tree.getRoot();
    expect(typeof root).toBe("string");
    expect(root.length).toBe(64);
  });

  test("root hash is 64 hex chars (BLAKE3)", async () => {
    const tree = new MerkleTree();
    tree.insert("a", "1");
    const root = await tree.getRoot();
    expect(root).toMatch(BLAKE3_HEX_PATTERN);
  });

  test("verify all entries in tree", async () => {
    const tree = new MerkleTree();
    tree.insert("a", "1");
    tree.insert("b", "2");
    tree.insert("c", "3");
    tree.insert("d", "4");

    const root = await tree.getRoot();

    for (const [key, value] of [
      ["a", "1"],
      ["b", "2"],
      ["c", "3"],
      ["d", "4"],
    ]) {
      const proof = await tree.getProof(key);
      expect(await MerkleTree.verify(key, value, proof, root)).toBe(true);
    }
  });

  test("remove invalidates root cache", async () => {
    const tree = new MerkleTree();
    tree.insert("a", "1");
    tree.insert("b", "2");
    const rootBefore = await tree.getRoot();
    tree.remove("b");
    const rootAfter = await tree.getRoot();
    expect(rootBefore).not.toBe(rootAfter);
  });

  test("deserialize preserves data fidelity", async () => {
    const tree = new MerkleTree();
    tree.insert("special:chars", "val!@#$");
    tree.insert("unicode", "\u{1F600}");

    const serialized = await tree.serialize();
    const restored = MerkleTree.deserialize(serialized);
    const diff = tree.diff(restored);
    expect(diff).toEqual([]);
  });
});
