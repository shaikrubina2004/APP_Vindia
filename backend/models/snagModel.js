let snags = [];

function getAll() {
  return snags;
}

function add(snag) {
  snags.push(snag);
  return snag;
}

function update(id, data) {
  snags = snags.map(s =>
    s.id === id ? { ...s, ...data } : s
  );
  return true;
}

module.exports = { getAll, add, update };