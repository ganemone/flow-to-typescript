/* @flow */

function Maybe(x: ?string): string {
  if (x) {
    return x
  }
  return 'default string'
}
