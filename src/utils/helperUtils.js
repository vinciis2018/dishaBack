export function wait(s) {
  return new Promise(resolve => setTimeout(resolve, s * 1000));
}
