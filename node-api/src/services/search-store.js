const searchResults = new Map();
let _counter = 0;

function nextId() {
  return ++_counter;
}

module.exports = { searchResults, nextId };
