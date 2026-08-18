type StatCardProps = {
    title: string;
    value: string;
  };
  
  export default function StatCard({ title, value }: StatCardProps) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm border">
        <p className="text-gray-500 text-sm">{title}</p>
  
        <h2 className="mt-3 text-3xl font-bold">
          {value}
        </h2>
      </div>
    );
  }