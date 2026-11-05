/**
 * three.js is too large for one readable file, so it comes in parts: three.1.js, three.2.js and so on,
 * then extras.js. Every part is an ordinary script file, listed in index.html in the order it runs.
 * A part calls foxtrailPart with its own name, the names of the earlier parts it builds on, and a
 * function that fills in what it offers. Nothing is fetched and no text is turned into code here.
 */
(() => {
  const parts = {}
  window.foxtrailPart = (name, needs, make) => {
    const offers = {}
    make(...needs.map(need => {
      if (need === 'exports') return offers
      const earlier = parts[need.replace(/^\.\//, '')]
      if (!earlier) throw new Error(`three.js part "${name}" needs "${need}", which has not loaded`)
      return earlier
    }))
    parts[name] = offers
  }
})()
