import CustomerEditPage from "@/src/lib/components/customers/CustomerEditPage";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;

  return <CustomerEditPage customerId={id} />;
}