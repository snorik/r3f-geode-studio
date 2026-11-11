export function initialQuality(mobile) {
  return { mode: "auto", name: mobile ? "low" : "medium", fps: null };
}

export function updateQuality(state, action) {
  if (action.type === "select") {
    return action.value === "auto"
      ? initialQuality(action.mobile)
      : { ...state, mode: "manual", name: action.value };
  }
  if (action.type === "benchmark" && state.mode === "auto") {
    const { fps, mobile } = action;
    return {
      ...state,
      fps: Math.round(fps),
      name: fps < 28 ? "low" : fps < 48 || mobile ? "medium" : "high",
    };
  }
  return state;
}

export function createFrameSampler() {
  let start = null;
  let last = 0;
  let frames = 0;
  let done = false;
  return (time) => {
    if (done) return null;
    if (start === null) {
      start = last = time;
      return null;
    }
    const delta = time - last;
    last = time;
    if (delta < 250) frames++;
    const elapsed = time - start;
    if ((elapsed > 3500 && frames >= 10) || elapsed > 8000) {
      done = true;
      return frames / (elapsed / 1000);
    }
    return null;
  };
}
