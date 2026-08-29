import Sidebar from "./Sidebar";
import Header from "./Header";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      dir="rtl"
      className="min-h-screen bg-slate-50 text-slate-900"
    >
      <div className="flex min-h-screen">
        <Sidebar />

        <div className="min-w-0 flex-1">
          <main className="min-h-screen px-3 pb-28 pt-3 sm:px-5 sm:pb-28 sm:pt-5 lg:px-8 lg:pb-8 lg:pt-6">
            <div className="mx-auto w-full max-w-[1600px]">
              <Header />

              <div className="mt-5 sm:mt-6">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}