export default function AuthLayout({ children }) {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-50 to-blue-100 p-6">
      {children}
    </div>
  );
}
