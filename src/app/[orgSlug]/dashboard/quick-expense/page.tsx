// Redirect legacy route /[org]/dashboard/quick-expense → /[org]/quick-expense
import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ orgSlug: string }>;
}

export default async function QuickExpenseLegacyRedirect({ params }: Props) {
  const { orgSlug } = await params;
  redirect(`/${orgSlug}/quick-expense`);
}
