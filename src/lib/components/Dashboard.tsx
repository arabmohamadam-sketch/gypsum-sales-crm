export default function Dashboard() {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <div className="max-w-7xl mx-auto">
  
          <h1 className="text-4xl font-bold text-slate-800 mb-8">
            داشبورد CRM فروش
          </h1>
  
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  
            <div className="bg-white rounded-2xl shadow p-6">
              <p className="text-gray-500">تعداد مشتریان</p>
              <h2 className="text-4xl font-bold mt-2 text-blue-600">
                154
              </h2>
            </div>
  
            <div className="bg-white rounded-2xl shadow p-6">
              <p className="text-gray-500">سفارش‌های امروز</p>
              <h2 className="text-4xl font-bold mt-2 text-green-600">
                12
              </h2>
            </div>
  
            <div className="bg-white rounded-2xl shadow p-6">
              <p className="text-gray-500">پیگیری امروز</p>
              <h2 className="text-4xl font-bold mt-2 text-orange-500">
                8
              </h2>
            </div>
  
            <div className="bg-white rounded-2xl shadow p-6">
              <p className="text-gray-500">فروش این ماه</p>
              <h2 className="text-4xl font-bold mt-2 text-purple-600">
                540 تن
              </h2>
            </div>
  
          </div>
  
        </div>
      </main>
    );
  }