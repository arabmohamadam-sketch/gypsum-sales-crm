import CustomerPage from "@/src/lib/components/customers/CustomerPage";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;

  return <CustomerPage customerId={id} />;
}