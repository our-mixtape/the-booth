/** Local visual review only; production builds cannot opt into this prototype. */
export function isLivingSleeveEnabled(development: boolean, search: string): boolean {
  return development && new URLSearchParams(search).get('livingSleeve') === '1';
}
