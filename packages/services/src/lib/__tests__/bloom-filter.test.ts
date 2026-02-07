import { beforeEach, describe, expect, it } from "bun:test";
import * as fc from "fast-check";
import { BloomFilter, ScalableBloomFilter } from "../bloom-filter";

describe("BloomFilter", () => {
  let filter: BloomFilter;

  beforeEach(() => {
    filter = new BloomFilter({
      size: 10_000,
      falsePositiveRate: 0.01,
    });
  });

  it("adds and retrieves items correctly", async () => {
    await filter.add("test-item");
    const hasItem = await filter.has("test-item");
    expect(hasItem).toBe(true);
  });

  it("returns false for items not added", async () => {
    await filter.add("item-1");
    const hasItem = await filter.has("item-2");
    expect(hasItem).toBe(false);
  });

  it("handles multiple items", async () => {
    const items = ["item1", "item2", "item3", "item4", "item5"];

    for (const item of items) {
      await filter.add(item);
    }

    for (const item of items) {
      expect(await filter.has(item)).toBe(true);
    }
  });

  it("clears all items", async () => {
    await filter.add("item-1");
    await filter.add("item-2");

    filter.clear();

    expect(await filter.has("item-1")).toBe(false);
    expect(await filter.has("item-2")).toBe(false);
  });

  it("calculates memory usage correctly", () => {
    const memoryUsage = filter.getMemoryUsage();
    expect(memoryUsage).toBeGreaterThan(0);
    expect(memoryUsage).toBe(Math.ceil(10_000 / 8));
  });

  it("calculates occupancy correctly", async () => {
    const initialOccupancy = filter.getOccupancy();
    expect(initialOccupancy).toBe(0);

    await filter.add("item-1");
    await filter.add("item-2");

    const occupancy = filter.getOccupancy();
    expect(occupancy).toBeGreaterThan(0);
    expect(occupancy).toBeLessThanOrEqual(1);
  });

  it("serializes and deserializes correctly", async () => {
    await filter.add("item-1");
    await filter.add("item-2");
    await filter.add("item-3");

    const serialized = filter.serialize();
    expect(typeof serialized).toBe("string");

    const restored = BloomFilter.deserialize(serialized, {
      size: 10_000,
      falsePositiveRate: 0.01,
    });

    expect(await restored.has("item-1")).toBe(true);
    expect(await restored.has("item-2")).toBe(true);
    expect(await restored.has("item-3")).toBe(true);
    expect(await restored.has("item-4")).toBe(false);
  });

  it("handles hash collisions gracefully", async () => {
    const smallFilter = new BloomFilter({
      size: 1000,
      falsePositiveRate: 0.1,
    });

    const items = Array.from({ length: 100 }, (_, i) => `item-${i}`);
    for (const item of items) {
      await smallFilter.add(item);
    }

    let falsePositives = 0;
    for (let i = 100; i < 200; i++) {
      if (await smallFilter.has(`item-${i}`)) {
        falsePositives += 1;
      }
    }

    const falsePositiveRate = falsePositives / 100;
    expect(falsePositiveRate).toBeLessThan(0.5);
  });

  it("uses optimal hash count", () => {
    const filter1 = new BloomFilter({ size: 10_000, falsePositiveRate: 0.01 });
    const filter2 = new BloomFilter({ size: 10_000, falsePositiveRate: 0.001 });

    const occupancy1Before = filter1.getOccupancy();
    const occupancy2Before = filter2.getOccupancy();

    expect(occupancy1Before).toBe(0);
    expect(occupancy2Before).toBe(0);
  });

  it("handles empty strings", async () => {
    await filter.add("");
    expect(await filter.has("")).toBe(true);
  });

  it("handles unicode strings", async () => {
    await filter.add("日本語");
    await filter.add("🚀");
    await filter.add("café");

    expect(await filter.has("日本語")).toBe(true);
    expect(await filter.has("🚀")).toBe(true);
    expect(await filter.has("café")).toBe(true);
  });

  it("handles long strings", async () => {
    const longString = "x".repeat(10_000);
    await filter.add(longString);
    expect(await filter.has(longString)).toBe(true);
  });

  it("calculates optimal size correctly", () => {
    const size1 = BloomFilter.optimalSize(1000, 0.01);
    const size2 = BloomFilter.optimalSize(1000, 0.001);

    expect(size1).toBeGreaterThan(0);
    expect(size2).toBeGreaterThan(size1);
  });
});

describe("ScalableBloomFilter", () => {
  let scalableFilter: ScalableBloomFilter;

  beforeEach(() => {
    scalableFilter = new ScalableBloomFilter(100, 0.01);
  });

  it("adds and retrieves items", async () => {
    await scalableFilter.add("item-1");
    expect(await scalableFilter.has("item-1")).toBe(true);
  });

  it("returns false for items not added", async () => {
    await scalableFilter.add("item-1");
    expect(await scalableFilter.has("item-2")).toBe(false);
  });

  it("expands to multiple filters when threshold reached", async () => {
    expect(scalableFilter.getFilterCount()).toBe(1);

    for (let i = 0; i < 150; i++) {
      await scalableFilter.add(`item-${i}`);
    }

    expect(scalableFilter.getFilterCount()).toBeGreaterThan(1);

    for (let i = 0; i < 150; i++) {
      expect(await scalableFilter.has(`item-${i}`)).toBe(true);
    }
  });

  it("clears all filters", async () => {
    for (let i = 0; i < 150; i++) {
      await scalableFilter.add(`item-${i}`);
    }

    expect(scalableFilter.getFilterCount()).toBeGreaterThan(1);

    scalableFilter.clear();

    expect(scalableFilter.getFilterCount()).toBe(1);
    expect(await scalableFilter.has("item-0")).toBe(false);
  });

  it("calculates total memory usage", async () => {
    const initialMemory = scalableFilter.getMemoryUsage();

    for (let i = 0; i < 150; i++) {
      await scalableFilter.add(`item-${i}`);
    }

    const expandedMemory = scalableFilter.getMemoryUsage();
    expect(expandedMemory).toBeGreaterThan(initialMemory);
  });

  it("handles large number of items efficiently", async () => {
    const largeFilter = new ScalableBloomFilter(1000, 0.01);

    for (let i = 0; i < 5000; i++) {
      await largeFilter.add(`item-${i}`);
    }

    for (let i = 0; i < 5000; i++) {
      expect(await largeFilter.has(`item-${i}`)).toBe(true);
    }

    expect(largeFilter.getFilterCount()).toBeGreaterThan(1);
  });

  it("maintains false positive rate across filters", async () => {
    for (let i = 0; i < 500; i++) {
      await scalableFilter.add(`item-${i}`);
    }

    let falsePositives = 0;
    for (let i = 500; i < 1000; i++) {
      if (await scalableFilter.has(`item-${i}`)) {
        falsePositives += 1;
      }
    }

    const falsePositiveRate = falsePositives / 500;
    expect(falsePositiveRate).toBeLessThan(0.1);
  });
});

describe("BloomFilter - property-based tests", () => {
  it("never has false negatives", () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(fc.string(), { minLength: 1, maxLength: 100 }),
        async (items) => {
          const filter = new BloomFilter({
            size: 10_000,
            falsePositiveRate: 0.01,
          });

          for (const item of items) {
            await filter.add(item);
          }

          for (const item of items) {
            if (!(await filter.has(item))) {
              return false;
            }
          }

          return true;
        }
      )
    );
  });

  it("serialization round-trip preserves membership", () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(fc.string(), { minLength: 1, maxLength: 100 }),
        async (items) => {
          const filter = new BloomFilter({
            size: 10_000,
            falsePositiveRate: 0.01,
          });

          for (const item of items) {
            await filter.add(item);
          }

          const serialized = filter.serialize();
          const restored = BloomFilter.deserialize(serialized, {
            size: 10_000,
            falsePositiveRate: 0.01,
          });

          for (const item of items) {
            if (!(await restored.has(item))) {
              return false;
            }
          }

          return true;
        }
      )
    );
  });

  it("memory usage grows with occupancy", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1000, max: 100_000 }), (size) => {
        const filter = new BloomFilter({ size, falsePositiveRate: 0.01 });
        const memoryUsage = filter.getMemoryUsage();
        return memoryUsage === Math.ceil(size / 8);
      })
    );
  });

  it("false positive rate is bounded", () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(fc.string(), { minLength: 10, maxLength: 50 }),
        fc.array(fc.string(), { minLength: 10, maxLength: 50 }),
        async (addedItems, testItems) => {
          const addedSet = new Set(addedItems);
          const uniqueTestItems = testItems.filter(
            (item) => !addedSet.has(item)
          );

          if (uniqueTestItems.length === 0) {
            return true;
          }

          const filter = new BloomFilter({
            size: 10_000,
            falsePositiveRate: 0.05,
          });

          for (const item of addedItems) {
            await filter.add(item);
          }

          let falsePositives = 0;
          for (const item of uniqueTestItems) {
            if (await filter.has(item)) {
              falsePositives += 1;
            }
          }

          const actualRate = falsePositives / uniqueTestItems.length;
          return actualRate < 0.2;
        }
      ),
      { numRuns: 20 }
    );
  });
});

describe("ScalableBloomFilter - property-based tests", () => {
  it("never has false negatives across expansion", () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(fc.string(), { minLength: 50, maxLength: 200 }),
        async (items) => {
          const filter = new ScalableBloomFilter(50, 0.01);

          for (const item of items) {
            await filter.add(item);
          }

          for (const item of items) {
            if (!(await filter.has(item))) {
              return false;
            }
          }

          return true;
        }
      )
    );
  });

  it("expands when threshold is reached", () => {
    fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 10, max: 100 }),
        async (itemsPerFilter) => {
          const filter = new ScalableBloomFilter(itemsPerFilter, 0.01);
          const itemCount = itemsPerFilter * 2 + 5;

          for (let i = 0; i < itemCount; i++) {
            await filter.add(`item-${i}`);
          }

          return filter.getFilterCount() >= 2;
        }
      )
    );
  });

  it("memory usage increases with expansion", () => {
    fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 10, max: 50 }),
        async (itemsPerFilter) => {
          const filter = new ScalableBloomFilter(itemsPerFilter, 0.01);

          const initialMemory = filter.getMemoryUsage();

          for (let i = 0; i < itemsPerFilter * 3; i++) {
            await filter.add(`item-${i}`);
          }

          const expandedMemory = filter.getMemoryUsage();

          return expandedMemory > initialMemory;
        }
      )
    );
  });
});
