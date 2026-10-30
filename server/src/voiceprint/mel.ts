/**
 * Mel filterbank + DCT, the two steps that turn a linear-frequency power
 * spectrum into the compact, perceptually-motivated MFCC coefficients.
 */

const NUM_FILTERS = 26;
const NUM_CEPSTRAL_COEFFS = 13;

function hzToMel(hz: number): number {
  return 2595 * Math.log10(1 + hz / 700);
}

function melToHz(mel: number): number {
  return 700 * (Math.pow(10, mel / 2595) - 1);
}

/** Builds a triangular mel filterbank matrix: numFilters x (fftSize/2 + 1). */
export function buildMelFilterbank(
  sampleRate: number,
  fftSize: number,
  numFilters = NUM_FILTERS,
  maxHz = 8000
): Float64Array[] {
  const numBins = fftSize / 2 + 1;
  const minMel = hzToMel(0);
  const maxMel = hzToMel(Math.min(maxHz, sampleRate / 2));

  const melPoints = new Array(numFilters + 2)
    .fill(0)
    .map((_, i) => minMel + ((maxMel - minMel) * i) / (numFilters + 1));
  const hzPoints = melPoints.map(melToHz);
  const binPoints = hzPoints.map((hz) => Math.floor(((fftSize + 1) * hz) / sampleRate));

  const filters: Float64Array[] = [];
  for (let m = 1; m <= numFilters; m++) {
    const filter = new Float64Array(numBins);
    const left = binPoints[m - 1];
    const center = binPoints[m];
    const right = binPoints[m + 1];

    for (let k = left; k < center; k++) {
      if (k >= 0 && k < numBins && center !== left) {
        filter[k] = (k - left) / (center - left);
      }
    }
    for (let k = center; k < right; k++) {
      if (k >= 0 && k < numBins && right !== center) {
        filter[k] = (right - k) / (right - center);
      }
    }
    filters.push(filter);
  }
  return filters;
}

/** Applies the filterbank to a power spectrum and returns log filter energies. */
export function applyMelFilterbank(powerSpectrum: Float64Array, filters: Float64Array[]): Float64Array {
  const energies = new Float64Array(filters.length);
  for (let i = 0; i < filters.length; i++) {
    let sum = 0;
    const filter = filters[i];
    for (let k = 0; k < filter.length; k++) {
      sum += filter[k] * powerSpectrum[k];
    }
    // Floor to avoid log(0) for silent/empty bins.
    energies[i] = Math.log(Math.max(sum, 1e-10));
  }
  return energies;
}

/** Type-II DCT, used to decorrelate log filter energies into cepstral
 *  coefficients. Returns only the first `numCoeffs` (the low-order
 *  coefficients that carry most of the vocal-tract shape information). */
export function dct(logEnergies: Float64Array, numCoeffs = NUM_CEPSTRAL_COEFFS): Float64Array {
  const N = logEnergies.length;
  const out = new Float64Array(numCoeffs);
  for (let k = 0; k < numCoeffs; k++) {
    let sum = 0;
    for (let n = 0; n < N; n++) {
      sum += logEnergies[n] * Math.cos((Math.PI / N) * (n + 0.5) * k);
    }
    out[k] = sum;
  }
  return out;
}

export { NUM_FILTERS, NUM_CEPSTRAL_COEFFS };
