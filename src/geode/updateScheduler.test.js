import { expect, test } from "bun:test";
import { createUpdateScheduler } from "./updateScheduler";

function setup() {
  let nextId = 0;
  const pending = new Map();
  const busy = [];
  const commits = [];
  const scheduler = createUpdateScheduler({
    schedule(callback) {
      const id = ++nextId;
      pending.set(id, callback);
      return id;
    },
    cancel: (id) => pending.delete(id),
    onBusy: (value) => busy.push(value),
    onCommit: (params, revision) => commits.push({ params, revision }),
  });
  const frame = () => {
    const callbacks = [...pending.values()];
    pending.clear();
    callbacks.forEach((callback) => callback());
  };
  return { scheduler, busy, commits, pending, frame };
}

test("only the latest request commits and its rendered revision clears loading", () => {
  const { scheduler, busy, commits, frame } = setup();
  scheduler.ready(0);
  scheduler.request({ density: 1 });
  frame();
  scheduler.request({ density: 2 });
  scheduler.ready(1);
  frame();
  frame();
  expect(commits).toEqual([{ params: { density: 2 }, revision: 2 }]);
  expect(busy).toEqual([null, "generating", "generating"]);
  scheduler.ready(2);
  expect(busy.at(-1)).toBeNull();
});

test("cancellation and graphics errors prevent pending commits", () => {
  const { scheduler, busy, commits, pending, frame } = setup();
  scheduler.request({ density: 1 });
  scheduler.cancel();
  expect(pending.size).toBe(0);
  frame();
  scheduler.request({ density: 2 });
  frame();
  scheduler.fail();
  scheduler.request({ density: 3 });
  frame();
  expect(commits).toEqual([]);
  expect(pending.size).toBe(0);
  expect(busy.at(-1)).toBeNull();
});
