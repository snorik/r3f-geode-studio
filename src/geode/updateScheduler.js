// Only the most recent request may commit or finish loading.
export function createUpdateScheduler({ schedule, cancel, onBusy, onCommit }) {
  let revision = 0;
  let scheduled = null;
  let failed = false;

  function cancelPending() {
    if (scheduled !== null) cancel(scheduled);
    scheduled = null;
    revision++;
  }

  return {
    request(params) {
      if (failed) return;
      cancelPending();
      const id = revision;
      onBusy("generating");
      scheduled = schedule(() => {
        if (id !== revision) return;
        scheduled = schedule(() => {
          if (id !== revision) return;
          scheduled = null;
          onCommit(params, id);
        });
      });
    },
    ready(id) {
      if (!failed && id === revision) onBusy(null);
    },
    fail() {
      cancelPending();
      failed = true;
      onBusy(null);
    },
    cancel() {
      // React may run effect cleanup before the first rendered frame.
      if (revision !== 0 || scheduled !== null) cancelPending();
    },
  };
}
