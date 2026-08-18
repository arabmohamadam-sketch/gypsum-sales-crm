type Props = {
    title: string;
    value: string;
    color: string;
  };
  
  export default function CustomerStats({
    title,
    value,
    color,
  }: Props) {
    return (
      <div className="rounded-2xl bg-white p-5 shadow border">
        <div className="text-sm text-gray-500">{title}</div>
  
        <div
          className="text-3xl font-bold mt-3"
          style={{ color }}
        >
          {value}
        </div>
      </div>
    );
  }