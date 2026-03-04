import { beforeEach, describe, expect, test } from "bun:test";
import { SQLitePubSub } from "../pubsub";

function noop() {
  return;
}

describe("SQLitePubSub", () => {
  let pubsub: SQLitePubSub;

  beforeEach(() => {
    pubsub = new SQLitePubSub();
  });

  test("subscribe and receive message", () => {
    const received: unknown[] = [];
    pubsub.subscribe("ch1", (msg) => received.push(msg));
    pubsub.publish("ch1", "hello");
    expect(received).toEqual(["hello"]);
  });

  test("publish returns number of listeners notified", () => {
    pubsub.subscribe("ch1", noop);
    pubsub.subscribe("ch1", noop);
    expect(pubsub.publish("ch1", "msg")).toBe(1);
  });

  test("publish returns 0 for channel with no subscribers", () => {
    expect(pubsub.publish("empty", "msg")).toBe(0);
  });

  test("unsubscribe specific handler", () => {
    const received: unknown[] = [];
    const handler = (msg: unknown) => received.push(msg);
    pubsub.subscribe("ch1", handler);
    pubsub.unsubscribe("ch1", handler);
    pubsub.publish("ch1", "msg");
    expect(received).toEqual([]);
  });

  test("unsubscribe all handlers for channel", () => {
    const received: unknown[] = [];
    pubsub.subscribe("ch1", (msg) => received.push(msg));
    pubsub.subscribe("ch1", (msg) => received.push(msg));
    pubsub.unsubscribe("ch1");
    pubsub.publish("ch1", "msg");
    expect(received).toEqual([]);
  });

  test("channels returns active channels", () => {
    pubsub.subscribe("a", noop);
    pubsub.subscribe("b", noop);
    expect(pubsub.channels().sort()).toEqual(["a", "b"]);
  });

  test("channels removes empty channels after unsubscribe", () => {
    pubsub.subscribe("a", noop);
    pubsub.unsubscribe("a", noop);
    expect(pubsub.channels()).toEqual([]);
  });

  test("multiple channels are independent", () => {
    const ch1: unknown[] = [];
    const ch2: unknown[] = [];
    pubsub.subscribe("ch1", (msg) => ch1.push(msg));
    pubsub.subscribe("ch2", (msg) => ch2.push(msg));
    pubsub.publish("ch1", "for-ch1");
    expect(ch1).toEqual(["for-ch1"]);
    expect(ch2).toEqual([]);
  });

  test("publish object messages", () => {
    const received: unknown[] = [];
    pubsub.subscribe("ch1", (msg) => received.push(msg));
    const obj = { type: "sync", data: [1, 2, 3] };
    pubsub.publish("ch1", obj);
    expect(received[0]).toEqual(obj);
  });

  test("unsubscribe from non-existent channel is no-op", () => {
    pubsub.unsubscribe("nonexistent");
    pubsub.unsubscribe("nonexistent", noop);
  });

  test("same handler subscribed twice receives message once (Set dedup)", () => {
    const received: unknown[] = [];
    const handler = (msg: unknown) => received.push(msg);
    pubsub.subscribe("ch1", handler);
    pubsub.subscribe("ch1", handler);
    pubsub.publish("ch1", "msg");
    expect(received.length).toBe(1);
  });
});
