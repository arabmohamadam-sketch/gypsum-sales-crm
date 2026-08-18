import Sidebar from "./Sidebar";
import Header from "./Header";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex bg-slate-100"
      dir="rtl"
    >
      <Sidebar />

      <main className="flex-1 p-8">

        <Header />

        <div className="mt-8">
          {children}
        </div>

      </main>

    </div>
  );
}