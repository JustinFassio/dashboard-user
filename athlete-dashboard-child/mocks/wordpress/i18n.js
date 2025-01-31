module.exports = {
  __: text => text,
  _n: (single, plural, number) => number === 1 ? single : plural,
  _x: (text, context) => text,
  sprintf: (format, ...args) => {
    let i = 0;
    return format.replace(/%s/g, () => args[i++]);
  }
}; 