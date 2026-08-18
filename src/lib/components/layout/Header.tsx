export default function Header() {
    return (
      <header className="bg-white h-20 rounded-2xl shadow px-8 flex items-center justify-between">
  
        <h2 className="text-2xl font-bold">
          داشبورد
        </h2>
  
        <input
          placeholder="جستجو..."
          className="border rounded-xl px-4 py-2 w-96"
        />
  
      </header>
    );
  }