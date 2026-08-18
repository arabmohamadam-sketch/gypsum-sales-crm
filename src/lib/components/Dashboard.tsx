import StatCard from "./StatCard";

export default function Dashboard() {
  return (
    <div className="max-w-7xl mx-auto">

      <div className="mb-10">
        <h1 className="text-3xl font-bold">
          داشبورد CRM گچ آهوان
        </h1>

        <p className="text-gray-500 mt-2">
          مدیریت مشتریان، سفارش‌ها و عملکرد فروش
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">

        <StatCard
          title="تعداد مشتریان"
          value="10,254"
        />

        <StatCard
          title="سفارش امروز"
          value="18"
        />

        <StatCard
          title="فروش این ماه"
          value="487 تن"
        />

        <StatCard
          title="پیگیری‌های امروز"
          value="12"
        />

      </div>

      <div className="grid gap-6 lg:grid-cols-2 mt-8">

        <div className="rounded-2xl bg-white shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">
            آخرین فعالیت‌ها
          </h2>

          <div className="text-gray-500">
            هنوز فعالیتی ثبت نشده است.
          </div>
        </div>

        <div className="rounded-2xl bg-white shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">
            پیشنهاد هوش مصنوعی
          </h2>

          <div className="text-gray-500">
            پس از اتصال به پایگاه داده،
            پیشنهاد تماس با مشتریان اینجا نمایش داده می‌شود.
          </div>
        </div>

      </div>

    </div>
  );
}