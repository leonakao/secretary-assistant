import { useLoaderData } from 'react-router';
import { ContactsPage } from '~/modules/contacts/pages/contacts-page';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

function normalizePositiveInteger(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

export async function clientLoader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const page = normalizePositiveInteger(
    url.searchParams.get('page'),
    DEFAULT_PAGE,
  );
  const pageSize = Math.min(
    normalizePositiveInteger(url.searchParams.get('pageSize'), DEFAULT_PAGE_SIZE),
    MAX_PAGE_SIZE,
  );
  const contactId = url.searchParams.get('contactId');

  return {
    page,
    pageSize,
    contactId: contactId && contactId.trim() ? contactId : null,
  };
}

export default function AppContactsRoute() {
  const loaderData = useLoaderData<typeof clientLoader>();

  return (
    <ContactsPage
      initialContactId={loaderData.contactId}
      initialPage={loaderData.page}
      initialPageSize={loaderData.pageSize}
    />
  );
}
