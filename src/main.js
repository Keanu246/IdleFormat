import suffixes from './suffixes.json'
// import _ from 'lodash'

function validate(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
  return condition
}

// Suffixes are a list - which index of the list do we want? 
// _index(999) === 0
// _index(1000) === 1
// _index(1000000) === 2
function _index(val) {
  // string length is faster but fails for length >= 20, where JS starts
  // formatting with e
  return Math.max(0, Math.floor(Math.log10(Math.abs(val))/3))
}

// The formatting function.
function _format(val, opts) {
  const index = _index(val)
  const suffix = opts.suffixFn(index)
  // opts.minSuffix: Use JS native formatting for smallish numbers, because
  // '99,999' is prettier than '99.9k'
  // TODO: handle 0 < val < 1 here
  if (Math.abs(val) < opts.minSuffix) {
    if (Math.abs(val) >= opts.minRound) {
      val = Math.floor(val)
    }
    return val.toLocaleString(undefined, {maximumSignificantDigits: opts.sigfigs})
  }
  // No suffix found: use scientific notation. JS's native toExponential is fine.
  if (!suffix && suffix !== '') {
    return val.toExponential(opts.sigfigs-1).replace('e+', 'e')
  }
  // Found a suffix. Calculate the prefix, the number before the suffix.
  const prefix = (val / Math.pow(1000, index)).toPrecision(opts.sigfigs)
  return `${prefix}${suffix}`
}

export const defaultOptions = {
  suffixGroups: suffixes, 
  // Flavor is a shortcut to modify any number of other options, like sigfigs.
  // It's much more commonly used by callers than suffixGroup, which only controls
  // suffixes. The two share the same possible names by default.
  flavor: 'long',
  suffixGroup: 'long',
  suffixFn(index) {
    var suffixes = this.suffixes || this.suffixGroups[this.suffixGroup]
    validate(suffixes, `no such suffixgroup: ${this.suffixGroup}`)
    if (index < suffixes.length) {
      return suffixes[index] || ''
    }
    // return undefined
  },
  // minimum value to use any suffix, because '99,900' is prettier than '99.9k'
  minSuffix: 1e5,
  // Show decimals below this value rounded to opts.sigfigs, instead of floor()ed
  minRound: 0,
  sigfigs: 3, // often overridden by flavor
  format: 'standard'
}
// User-visible format choices, like on swarmsim's options screen. 
// Each has a different set of options.
const Formats = {
  standard: {},
  // like standard formatting, with no suffixes at all
  scientific: {suffixGroups: {long: [], short: []}},
  // like standard formatting, with a smaller set of suffixes
  hybrid: {
    suffixGroups: {
      long: defaultOptions.suffixGroups.long.slice(0, 12),
      short: defaultOptions.suffixGroups.short.slice(0, 12),
    },
  },
  // like standard formatting, with a different/infinite set of suffixes
  engineering: {suffixFn: index => index === 0 ? '' : `E${index*3}`},
}
// A convenient way for the developer to modify formatters.
// These are different from formats - not user-visible.
const Flavors = {
  long: {suffixGroup: 'long', sigfigs: 5},
  short: {suffixGroup: 'short', sigfigs: 3},
}
// Allow callers to extend formats and flavors.
defaultOptions.formats = Formats
defaultOptions.flavors = Flavors

export class Formatter {
  constructor(opts = {}) {
    this.opts = opts
  }
  
  _normalizeOpts(opts={}) {
    // all the user-specified opts, no defaults
    opts = Object.assign({}, this.opts, opts)
    // opts.format redefines some other opts, but should never override the user's opts
    var format = opts && opts.format
    var formats = (opts && opts.formats) || defaultOptions.formats
    var formatOptions = formats[format || defaultOptions.format]
    validate(formatOptions, `no such format: ${format}`)
    var flavor = opts && opts.flavor
    var flavors = (opts && opts.flavors) || defaultOptions.flavors
    var flavorOptions = flavors[flavor || defaultOptions.flavor]
    validate(flavorOptions, `no such flavor: ${flavor}`)
    // finally, add the implied options: defaults and format-derived
    return Object.assign({}, defaultOptions, formatOptions, flavorOptions, opts)
  }
  index(val) {
    return _index(val)
  }
  suffix(val, opts) {
    opts = this._normalizeOpts(opts)
    return opts.suffixFn(_index(val))
  }
  format(val, opts) {
    opts = this._normalizeOpts(opts)
    return _format(val, opts)
  }
}

const numberformat = new Formatter()
numberformat.defaultOptions = defaultOptions
numberformat.Formatter = Formatter
export default numberformat

// this is just to make the browser api nicer
export const format = (val, opts) => numberformat.format(val, opts)
