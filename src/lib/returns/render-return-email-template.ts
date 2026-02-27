export function renderReturnEmailTemplate(
  template: string,
  vars: {
    name?: string | null;
    month: string;
    amount: string;
  }
): string {
  return template
    .replaceAll('{{name}}', vars.name ?? '')
    .replaceAll('{{month}}', vars.month)
    .replaceAll('{{amount}}', vars.amount);
}
