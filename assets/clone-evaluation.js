(() => {
  const data = window.VOICESHIELD_EVAL;
  const cloneTable = document.querySelector("#clone-table");
  if (!data || !cloneTable) return;

  const audio = (src, label) => {
    const player = document.createElement("audio");
    player.controls = true;
    player.preload = "metadata";
    player.setAttribute("aria-label", label);
    const source = document.createElement("source");
    source.src = src;
    source.type = "audio/wav";
    player.append(source);
    return player;
  };

  const fmt = (value) => Number(value).toFixed(3);

  const header = document.createElement("div");
  header.className = "table-header";
  header.setAttribute("role", "row");
  [
    "TTS system",
    ...data.samples.map(
      (_, index) => `Sample ${String(index + 1).padStart(2, "0")}`
    )
  ].forEach((label) => {
    const cell = document.createElement("div");
    cell.setAttribute("role", "columnheader");
    cell.textContent = label;
    header.append(cell);
  });
  cloneTable.append(header);

  data.models.forEach((model) => {
    const row = document.createElement("div");
    row.className = "model-row";
    row.setAttribute("role", "row");

    const modelCell = document.createElement("div");
    modelCell.className = "model-cell";
    modelCell.setAttribute("role", "rowheader");
    const averageDrop =
      model.samples.reduce((sum, sample) => sum + sample.delta, 0) /
      model.samples.length;
    modelCell.innerHTML =
      `<h3>${model.name}</h3><p>Average ΔSIM: ${fmt(averageDrop)}</p>`;
    row.append(modelCell);

    data.samples
      .map((id) => model.samples.find((sample) => sample.id === id))
      .forEach((sample) => {
        const cell = document.createElement("div");
        cell.className = "clone-cell";
        cell.setAttribute("role", "cell");

        const original = document.createElement("div");
        original.className = "clone-block";
        original.innerHTML =
          `<div class="clone-head"><span>Original Cloned</span>` +
          `<span class="sim">SIM: <strong>${fmt(sample.original)}</strong></span></div>`;
        original.append(
          audio(
            `audio/clones/${model.slug}/sample-${sample.id}-original-cloned.wav`,
            `${model.name}, Sample ${sample.id}, cloned from original speech`
          )
        );

        const protectedClone = document.createElement("div");
        protectedClone.className = "clone-block protected";
        protectedClone.innerHTML =
          `<div class="clone-head"><span>Protected Cloned</span>` +
          `<span class="sim">SIM: <strong>${fmt(sample.protected)}</strong></span></div>`;
        if (sample.protectedAudioAvailable === false) {
          const unavailable = document.createElement("div");
          unavailable.className = "audio-unavailable";
          unavailable.textContent = "Audio file unavailable";
          protectedClone.append(unavailable);
        } else {
          protectedClone.append(
            audio(
              `audio/clones/${model.slug}/sample-${sample.id}-protected-cloned.wav`,
              `${model.name}, Sample ${sample.id}, cloned from protected speech`
            )
          );
        }

        const delta = document.createElement("div");
        delta.className = "delta";
        delta.textContent =
          `ΔSIM (protected − original): ${fmt(sample.delta)}`;

        cell.append(original, protectedClone, delta);
        row.append(cell);
      });

    cloneTable.append(row);
  });
})();
